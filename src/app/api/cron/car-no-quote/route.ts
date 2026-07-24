// src/app/api/cron/car-no-quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = assertCron(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("car_requests")
    .select("id, locale, customer_email, customer_name")
    .eq("status", "sent")
    .is("no_quote_notified_at", null)
    .lt("created_at", cutoff);

  const { sendCustomerNoQuoteYet } = await import("@/lib/email");
  let notified = 0;
  for (const r of rows ?? []) {
    try {
      await sendCustomerNoQuoteYet({
        email: r.customer_email,
        locale: r.locale ?? "en",
        customerName: r.customer_name,
      });
      await supabase
        .from("car_requests")
        .update({ no_quote_notified_at: new Date().toISOString() })
        .eq("id", r.id);
      notified++;
    } catch (e) {
      console.error("[cron/car-no-quote] failed for", r.id, e);
    }
  }
  return NextResponse.json({ ok: true, notified });
}
