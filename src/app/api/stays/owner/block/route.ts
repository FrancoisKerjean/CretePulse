// Le proprietaire bloque ou libere des nuits depuis son espace.
//
// Deux garde-fous qui ne sont pas negociables :
//  - on REFUSE de bloquer une plage qui contient une nuit vendue. Ecrire par
//    dessus lui laisserait croire que la date est a lui alors qu'un voyageur a
//    paye, et il la revendrait ailleurs.
//  - il ne libere que ses propres `hold`. Une nuit vendue n'est pas la sienne,
//    une nuit OTA reviendrait a la synchronisation suivante.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/stays/tokens";
import { nightsToBlock, canRelease, MAX_BLOCK_NIGHTS } from "@/lib/stays/owner-rules";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const listingId = Number(body.listingId);
  const action = body.action === "release" ? "release" : "block";

  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("id")
    .eq("owner_token_hash", hashToken(token))
    .maybeSingle();
  if (!owner) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { data: listing } = await supabaseAdmin
    .from("stay_listings")
    .select("id, owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.owner_id !== owner.id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const nights = nightsToBlock(String(body.dateFrom ?? ""), String(body.dateTo ?? ""));
  if (nights.length === 0) {
    return NextResponse.json(
      { ok: false, error: `Dates invalides, ou plage supérieure à ${MAX_BLOCK_NIGHTS} nuits.` },
      { status: 422 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("stay_availability")
    .select("date, status")
    .eq("listing_id", listingId)
    .in("date", nights);
  const known = (existing ?? []) as Array<{ date: string; status: string }>;

  if (action === "block") {
    const sold = known.filter((n) => n.status === "booked").map((n) => n.date);
    if (sold.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Ces nuits sont déjà réservées : ${sold.join(", ")}` },
        { status: 409 },
      );
    }
    const toWrite = nights.filter((d) => !known.some((n) => n.date === d));
    if (toWrite.length > 0) {
      await supabaseAdmin.from("stay_availability").upsert(
        toWrite.map((date) => ({
          listing_id: listingId,
          date,
          status: "hold",
          source: "owner",
        })),
        { onConflict: "listing_id,date" },
      );
    }
    return NextResponse.json({ ok: true, blocked: toWrite.length });
  }

  const releasable = known.filter((n) => canRelease(n.status)).map((n) => n.date);
  if (releasable.length > 0) {
    // Restreint a `hold` cote SQL aussi : double garde contre la liberation
    // accidentelle d'une nuit vendue.
    await supabaseAdmin
      .from("stay_availability")
      .delete()
      .eq("listing_id", listingId)
      .eq("status", "hold")
      .in("date", releasable);
  }
  return NextResponse.json({ ok: true, released: releasable.length });
}
