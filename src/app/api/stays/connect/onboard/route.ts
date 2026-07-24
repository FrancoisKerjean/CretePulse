import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { siteBase } from "@/lib/stays/tokens";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const ownerId = Number(url.searchParams.get("owner"));
  const success = url.searchParams.get("success") === "true";

  if (success && Number.isFinite(ownerId)) {
    await supabaseAdmin.from("stay_owners").update({ kyc_status: "complete" }).eq("id", ownerId);
    return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=done`);
  }
  return NextResponse.redirect(`${siteBase()}/fr/stays/new?kyc=refresh`);
}
