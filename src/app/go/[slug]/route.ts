import { NextRequest, NextResponse } from "next/server";
import { findActiveBySlug, insertClick } from "@/lib/affiliate-store";
import { hashIp } from "@/lib/affiliate";
import { leavingPage } from "@/lib/leaving-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const IP_SALT = process.env.AFFILIATE_IP_SALT || "";

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const affiliate = await findActiveBySlug(slug);
  if (!affiliate) {
    return NextResponse.redirect(SITE_URL, 302);
  }

  // Best-effort click log; never block the redirect.
  try {
    const ipRaw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    await insertClick({
      affiliate_id: affiliate.id,
      referer: request.headers.get("referer"),
      ua: request.headers.get("user-agent"),
      ip_hash: ipRaw ? hashIp(ipRaw, IP_SALT) : null,
    });
  } catch (e) {
    console.error("[go] click log failed:", e);
  }

  // Interstitial exit page instead of an immediate 302. The affiliate self-serve
  // lets anyone register an arbitrary redirect_url, so a bare redirect would let
  // crete.direct's reputation be borrowed for phishing. Showing the destination
  // domain before leaving neutralises that (standard exit-interstitial pattern).
  const html = leavingPage(affiliate.redirect_url);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
