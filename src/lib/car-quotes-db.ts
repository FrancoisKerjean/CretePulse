// Lectures Supabase du modèle multi-devis. La page offres et l'admin lisent ici.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import type { QuoteInvite, QuoteOption } from "@/lib/car-quotes";

/** Tous les devis/invites d'une demande, avec le nom du loueur. */
export async function quotesForRequest(requestId: number): Promise<QuoteInvite[]> {
  const { data } = await supabase.from("car_quote_invites")
    .select("id, partner_id, status, quote_price, quote_currency, quote_car_model, quote_inclusions, quoted_at, relanced_at, car_partners(name)")
    .eq("request_id", requestId);
  type Row = {
    id: number;
    partner_id: number;
    status: string;
    quote_price: number | null;
    quote_currency: string | null;
    quote_car_model: string | null;
    quote_inclusions: string[] | null;
    quoted_at: string | null;
    relanced_at: string | null;
    car_partners?: { name?: string } | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id, partner_id: r.partner_id,
    partner_name: r.car_partners?.name ?? "Agency",
    status: r.status as QuoteInvite["status"], quote_price: r.quote_price, quote_currency: r.quote_currency,
    quote_car_model: r.quote_car_model, quote_inclusions: r.quote_inclusions,
    quoted_at: r.quoted_at, relanced_at: r.relanced_at,
  }));
}

/** Toutes les options (variantes de prix) d'une demande, avec le nom du loueur.
 *  Source des offres présentées au client dans la page /car-offer. */
export async function optionsForRequest(requestId: number): Promise<QuoteOption[]> {
  const { data } = await supabase.from("car_quote_options")
    .select("id, invite_id, partner_id, price, currency, car_model, gearbox, inclusions, insurance_type, excess_eur, zero_excess_upsell_eur_day, created_at, car_partners(name)")
    .eq("request_id", requestId);
  type Row = {
    id: number; invite_id: number; partner_id: number;
    price: number; currency: string | null;
    car_model: string | null; gearbox: string | null; inclusions: string[] | null;
    insurance_type: string | null; excess_eur: number | null; zero_excess_upsell_eur_day: number | null;
    created_at: string | null; car_partners?: { name?: string } | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id, invite_id: r.invite_id, partner_id: r.partner_id,
    partner_name: r.car_partners?.name ?? "Agency",
    price: r.price, currency: r.currency ?? "EUR",
    car_model: r.car_model, gearbox: r.gearbox, inclusions: r.inclusions,
    insurance_type: r.insurance_type, excess_eur: r.excess_eur, zero_excess_upsell_eur_day: r.zero_excess_upsell_eur_day,
    created_at: r.created_at,
  }));
}

/** Demande + ses devis (invite-level, admin) et options (client) à partir du
 *  token client. null si introuvable. */
export async function requestByClientToken(token: string): Promise<{ request: Record<string, unknown>; quotes: QuoteInvite[]; options: QuoteOption[] } | null> {
  const { data: request } = await supabase.from("car_requests")
    .select("id, status, locale, pickup_slug, date_from, time_from, date_to, time_to, car_type, customer_name, customer_email, customer_phone")
    .eq("accept_token_hash", hashToken(token)).maybeSingle();
  if (!request) return null;
  const quotes = await quotesForRequest(request.id as number);
  const options = await optionsForRequest(request.id as number);
  return { request, quotes, options };
}
