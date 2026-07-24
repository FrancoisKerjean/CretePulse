import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

// Van partage a la demande (lot 1) : capture d'intention sur paires bus non
// desservies ou uniquement en correspondance. Pas d'email envoye en v1, seule
// la ligne est stockee ; le concierge se declenche au seuil (~4/paire/sem).
// Anti-abus clone du pattern car-rental/submit (honeypot + rate-limit IP).
const RL_MAX_PER_HOUR = 4;
const RL_MAX_PER_DAY = 12;

const VALID_SOURCES = new Set(["journey-no-route", "journey-indirect", "route-page"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]{2,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clientIpHash(request: NextRequest): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return null;
  const salt = process.env.CAR_RL_SALT || "crete-direct-car-rl";
  return createHash("sha256").update(ip + salt).digest("hex");
}

async function ipRateLimited(ipHash: string): Promise<boolean> {
  const countSince = async (ms: number): Promise<number> => {
    const since = new Date(Date.now() - ms).toISOString();
    const { count } = await supabase.from("van_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    return count ?? 0;
  };
  if (await countSince(60 * 60 * 1000) >= RL_MAX_PER_HOUR) return true;
  if (await countSince(24 * 60 * 60 * 1000) >= RL_MAX_PER_DAY) return true;
  return false;
}

function str(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  return s;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot : un bot remplit tous les champs, y compris ceux caches.
  const hp = typeof body.website === "string" ? body.website : "";
  if (hp) return NextResponse.json({ ok: true });

  const fromSlug = str(body.from_slug, 64);
  const toSlug = str(body.to_slug, 64);
  const travelDate = str(body.travel_date, 10);
  const email = str(body.customer_email, 200);
  const source = str(body.source, 40);
  const localeIn = str(body.locale, 4);
  const locale = localeIn && ["en", "fr", "de", "el"].includes(localeIn) ? localeIn : "en";
  const fromPlace = str(body.from_place, 120);
  const toPlace = str(body.to_place, 120);
  const noteIn = str(body.note, 500);
  const paxNum = typeof body.pax === "number" ? Math.floor(body.pax) : Number(body.pax);
  const pax = Number.isFinite(paxNum) && paxNum >= 1 && paxNum <= 12 ? paxNum : null;
  const bestChangesNum = typeof body.best_changes === "number"
    ? Math.floor(body.best_changes) : Number(body.best_changes);
  const bestChanges = Number.isFinite(bestChangesNum) && bestChangesNum >= 0 && bestChangesNum <= 5
    ? bestChangesNum : null;

  if (!fromSlug || !SLUG_RE.test(fromSlug)) return NextResponse.json({ error: "Invalid from_slug" }, { status: 400 });
  if (!toSlug || !SLUG_RE.test(toSlug)) return NextResponse.json({ error: "Invalid to_slug" }, { status: 400 });
  if (fromSlug === toSlug) return NextResponse.json({ error: "Same origin and destination" }, { status: 400 });
  if (!travelDate || !DATE_RE.test(travelDate)) return NextResponse.json({ error: "Invalid travel_date" }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (!pax) return NextResponse.json({ error: "Invalid pax" }, { status: 400 });
  if (!source || !VALID_SOURCES.has(source)) return NextResponse.json({ error: "Invalid source" }, { status: 400 });

  const ipHash = clientIpHash(request);
  if (ipHash && await ipRateLimited(ipHash)) {
    return NextResponse.json({ ok: true });
  }

  // Dedup : meme email + meme paire + meme date dans les 10 min -> silent success.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: dup } = await supabase.from("van_requests").select("id")
    .eq("customer_email", email)
    .eq("from_slug", fromSlug)
    .eq("to_slug", toSlug)
    .eq("travel_date", travelDate)
    .gte("created_at", tenMinAgo).limit(1);
  if (dup && dup.length > 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("van_requests").insert({
    locale,
    from_slug: fromSlug,
    to_slug: toSlug,
    from_place: fromPlace,
    to_place: toPlace,
    travel_date: travelDate,
    pax,
    customer_email: email,
    note: noteIn,
    source,
    best_changes: bestChanges,
    ip_hash: ipHash,
  });
  if (error) {
    console.error("[van-interest] insert error:", error.message);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
