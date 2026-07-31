// Acces base de la facture de commission. Separe de car-invoice.ts pour que la
// logique de decision reste testable sans Supabase.
import { supabaseAdmin } from "./supabase-admin";
import { newToken, hashToken } from "./car-quote";
import { creditNumberFor } from "./car-invoice";

export interface InvoiceRow {
  id: number;
  number: string;
  request_id: number;
  partner_id: number;
  base_amount_eur: number;
  rate: number;
  amount_eur: number;
  issued_at: string;
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  credit_number: string | null;
  credit_reason: string | null;
}

const COLS =
  "id, number, request_id, partner_id, base_amount_eur, rate, amount_eur, issued_at, sent_at, paid_at, credited_at, credit_number, credit_reason";

export async function invoiceForRequest(requestId: number): Promise<InvoiceRow | null> {
  const { data } = await supabaseAdmin
    .from("car_commission_invoices")
    .select(COLS)
    .eq("request_id", requestId)
    .maybeSingle();
  return (data as InvoiceRow) ?? null;
}

export async function invoiceByToken(token: string): Promise<InvoiceRow | null> {
  const { data } = await supabaseAdmin
    .from("car_commission_invoices")
    .select(COLS)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as InvoiceRow) ?? null;
}

export interface CreateInvoiceInput {
  requestId: number;
  partnerId: number;
  base: number;
  rate: number;
  amount: number;
}

export interface CreateInvoiceResult {
  invoice: InvoiceRow;
  /** Le token en clair n est disponible qu a la creation, jamais relu ensuite. */
  token: string | null;
  reused: boolean;
}

/**
 * Cree la facture, ou rend celle qui existe deja. Le numero n est demande a la
 * base QUE si une creation a lieu : un numero consomme pour rien laisserait un
 * trou dans une serie qui doit rester continue.
 */
export async function createInvoiceForRequest(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const existing = await invoiceForRequest(input.requestId);
  if (existing) return { invoice: existing, token: null, reused: true };

  const { data: number, error: numErr } = await supabaseAdmin.rpc("next_car_invoice_number");
  if (numErr || !number) throw new Error(`numerotation impossible: ${numErr?.message ?? "vide"}`);

  const token = newToken();
  const { data, error } = await supabaseAdmin
    .from("car_commission_invoices")
    .insert({
      number,
      request_id: input.requestId,
      partner_id: input.partnerId,
      base_amount_eur: input.base,
      rate: input.rate,
      amount_eur: input.amount,
      token_hash: hashToken(token),
    })
    .select(COLS)
    .maybeSingle();

  if (error || !data) {
    // Course perdue contre un autre appel : la contrainte UNIQUE a fait son
    // travail, on rend la facture de l autre plutot que d echouer.
    const other = await invoiceForRequest(input.requestId);
    if (other) return { invoice: other, token: null, reused: true };
    throw new Error(`creation de facture impossible: ${error?.message ?? "vide"}`);
  }
  return { invoice: data as InvoiceRow, token, reused: false };
}

export async function markInvoiceSent(id: number): Promise<void> {
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .select();
}

/**
 * Regenere le jeton d une facture et rend le nouveau en clair. Le jeton est
 * stocke hache donc jamais relisible : un renvoi ne peut pas reutiliser
 * l ancien lien, il doit en fabriquer un neuf. Remplacer le hash invalide au
 * passage un lien qui aurait pu s egarer. Le NUMERO de facture, lui, ne change
 * jamais : c est une piece comptable.
 */
export async function rotateInvoiceToken(id: number): Promise<string> {
  const token = newToken();
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({ token_hash: hashToken(token) })
    .eq("id", id)
    .select();
  return token;
}

export async function markInvoicePaid(requestId: number): Promise<void> {
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({ paid_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .is("paid_at", null)
    .select();
}

export async function creditInvoice(id: number, number: string, reason: string): Promise<string> {
  const creditNumber = creditNumberFor(number);
  await supabaseAdmin
    .from("car_commission_invoices")
    .update({
      credited_at: new Date().toISOString(),
      credit_number: creditNumber,
      credit_reason: reason,
    })
    .eq("id", id)
    .is("credited_at", null)
    .select();
  return creditNumber;
}
