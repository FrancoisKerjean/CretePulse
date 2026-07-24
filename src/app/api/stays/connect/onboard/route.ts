import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { siteBase } from "@/lib/stays/tokens";
import { stripeClient } from "@/lib/stays/stripe-helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const ownerId = Number(url.searchParams.get("owner"));
  const account = url.searchParams.get("account");
  const success = url.searchParams.get("success") === "true";

  if (success && Number.isFinite(ownerId) && account) {
    let enabled = false;
    try {
      const acct = await stripeClient().accounts.retrieve(account);
      enabled = Boolean(acct.charges_enabled && acct.details_submitted);
    } catch {
      enabled = false;
    }
    if (enabled) {
      await supabaseAdmin.from("stay_owners").update({ kyc_status: "complete" }).eq("id", ownerId);
      return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=done`);
    }
    await supabaseAdmin.from("stay_owners").update({ kyc_status: "pending" }).eq("id", ownerId);
    return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=incomplete`);
  }
  return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=refresh`);
}
