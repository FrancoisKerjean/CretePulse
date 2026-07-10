import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { closedResponderNeedsNotification, type ClosedRequestStatus } from "@/lib/car-quotes";

export type PartnerClosureReason =
  | "not_chosen"
  | "client_declined_all"
  | "client_silent"
  | "rental_started";

type ClosedInviteRow = {
  id: number;
  partner_id: number;
  status: string;
  quote_price: number | null;
  quote_currency: string | null;
  closed_notified_at: string | null;
  car_requests?: {
    id: number;
    status: ClosedRequestStatus;
    pickup_slug: string;
    date_from: string;
    date_to: string;
  } | Array<{
    id: number;
    status: ClosedRequestStatus;
    pickup_slug: string;
    date_from: string;
    date_to: string;
  }> | null;
  car_partners?: {
    name?: string | null;
    email?: string | null;
  } | Array<{
    name?: string | null;
    email?: string | null;
  }> | null;
};

export async function notifyClosedCarQuoteResponders(requestId?: number): Promise<number> {
  return notifyClosedCarQuoteRespondersWithReason(requestId);
}

export async function notifyClosedCarQuoteRespondersWithReason(
  requestId?: number,
  reasonOverride?: PartnerClosureReason,
): Promise<number> {
  let query = supabase
    .from("car_quote_invites")
    .select(`
      id, partner_id, status, quote_price, quote_currency, closed_notified_at,
      car_requests!inner(id, status, pickup_slug, date_from, date_to),
      car_partners(name, email)
    `)
    .eq("status", "not_chosen")
    .is("closed_notified_at", null)
    .not("quote_price", "is", null)
    .in("car_requests.status", ["accepted", "declined_by_client"]);

  if (requestId != null) query = query.eq("request_id", requestId);

  const { data, error } = await query.limit(50);
  if (error) {
    console.error("[car-closure-notifications] query error:", error.message);
    return 0;
  }

  const { sendPartnerClosureUpdate } = await import("@/lib/email");
  let sent = 0;

  for (const row of (data ?? []) as unknown as ClosedInviteRow[]) {
    const req = Array.isArray(row.car_requests) ? row.car_requests[0] : row.car_requests;
    const partner = Array.isArray(row.car_partners) ? row.car_partners[0] : row.car_partners;
    if (!req || !partner?.email) continue;
    if (!closedResponderNeedsNotification(row, req.status)) continue;

    try {
      await sendPartnerClosureUpdate({
        email: partner.email,
        partnerName: partner.name ?? "there",
        reason: reasonOverride ?? (req.status === "accepted" ? "not_chosen" : "client_declined_all"),
        pickupLabel: carPickupLabel(req.pickup_slug),
        dateFrom: req.date_from,
        dateTo: req.date_to,
        price: row.quote_price,
        currency: row.quote_currency ?? "EUR",
      });
      await supabase
        .from("car_quote_invites")
        .update({ closed_notified_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      console.error("[car-closure-notifications] send failed", row.id, e);
    }
  }

  return sent;
}
