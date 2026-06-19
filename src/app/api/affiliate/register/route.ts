import { NextRequest, NextResponse } from "next/server";
import {
  validateRegisterPayload,
  buildUniqueSlug,
  genCodePromo,
  randomSuffix,
  AFFILIATE_DEFAULT_COMMISSION_PCT,
} from "@/lib/affiliate";
import { slugExists, codeExists, emailExists, insertAffiliate } from "@/lib/affiliate-store";
import { notifyNewAffiliate } from "@/lib/affiliate-notify";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: bots fill hidden "website" field.
  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const v = validateRegisterPayload(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });

  if (await emailExists(v.data.email)) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
  }

  const slug = await buildUniqueSlug(v.data.name, slugExists);

  let code = genCodePromo(slug, randomSuffix(4));
  for (let i = 0; i < 5 && (await codeExists(code)); i++) code = genCodePromo(slug, randomSuffix(4));

  const inserted = await insertAffiliate({
    ...v.data,
    slug,
    code_promo: code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
  if (!inserted) return NextResponse.json({ error: "Could not register, try again" }, { status: 500 });

  const link = `${SITE_URL}/go/${slug}`;
  await notifyNewAffiliate({
    name: v.data.name,
    category: v.data.category,
    area: v.data.area,
    email: v.data.email,
    link,
  });

  return NextResponse.json({
    ok: true,
    slug,
    link,
    code,
    commission_pct: AFFILIATE_DEFAULT_COMMISSION_PCT,
  });
}
