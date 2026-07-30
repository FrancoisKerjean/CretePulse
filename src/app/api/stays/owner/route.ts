// Le proprietaire modifie son annonce depuis son espace, sans compte ni mot de
// passe : le jeton stable fait l'authentification.
//
// Deux verifications, jamais une seule : le jeton identifie un proprietaire, et
// l'annonce doit lui appartenir. Un jeton valide ne donne pas acces aux annonces
// des autres.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/stays/tokens";
import { validateOwnerUpdate, type OwnerUpdate } from "@/lib/stays/owner-rules";

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const listingId = Number(body.listingId);

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

  const update: OwnerUpdate = {
    basePriceEur: num(body.basePriceEur),
    cleaningFeeEur: num(body.cleaningFeeEur),
    minNights: num(body.minNights),
    published: typeof body.published === "boolean" ? body.published : undefined,
  };

  const error = validateOwnerUpdate(update);
  if (error) return NextResponse.json({ ok: false, error }, { status: 422 });

  // On n'ecrit que ce qui a ete envoye : un formulaire partiel ne doit pas
  // remettre les autres valeurs a zero.
  const patch: Record<string, unknown> = {};
  if (update.basePriceEur !== undefined) patch.base_price_eur = update.basePriceEur;
  if (update.cleaningFeeEur !== undefined) patch.cleaning_fee_eur = update.cleaningFeeEur;
  if (update.minNights !== undefined) patch.min_nights = update.minNights;
  if (update.published !== undefined) {
    // Hors ligne, jamais supprimee : le proprietaire doit pouvoir revenir.
    patch.status = update.published ? "published" : "unpublished";
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const { error: dbError } = await supabaseAdmin
    .from("stay_listings")
    .update(patch)
    .eq("id", listingId);
  if (dbError) return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
