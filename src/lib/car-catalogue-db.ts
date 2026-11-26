// Accès base du catalogue de prix loueur (car_partners + car_partner_rates).
// ⛔ PostgREST ne lève jamais : toute écriture lit `error` et passe par assertWritten.
import { createHmac } from "crypto";
import { supabaseAdmin } from "./supabase-admin";
import { assertWritten } from "./car-invoice-server";
import { PARTNER_IDENTITY_COLS, type PartnerLegalRow } from "./car-invoice";
import { hashToken } from "./car-quote";
import { secretOk } from "./car-admin-auth";
import { todayAthens } from "./car-partner-identity";
import type { CatalogueConditions, PartnerWithTerms, RateRow } from "./car-catalogue";

export type RatesStatus = "none" | "draft" | "live" | "paused";

export interface PortalPartner extends PartnerLegalRow {
  id: number;
  name: string;
  terms_version: string | null;
  terms_accepted_at: string | null;
  rates_status: RatesStatus;
  rates_paused_until: string | null;
  rates_published_at: string | null;
  catalogue_conditions: CatalogueConditions | null;
}

const PORTAL_COLS =
  `id, name, ${PARTNER_IDENTITY_COLS}, terms_version, terms_accepted_at, rates_status, rates_paused_until, rates_published_at, catalogue_conditions`;

/** Loueur désigné par le lien de son portail. La base compare des hashes : le clair n'y est jamais. */
export async function partnerByPortalToken(token: string): Promise<PortalPartner | null> {
  if (!token || token.length > 100) return null;
  const { data, error } = await supabaseAdmin
    .from("car_partners").select(PORTAL_COLS).eq("portal_token", hashToken(token)).maybeSingle();
  if (error) throw new Error(`partnerByPortalToken refusé par la base: ${error.message}`);
  return (data as unknown as PortalPartner | null) ?? null;
}

/**
 * Jeton du portail, DÉRIVÉ de l'id du loueur par HMAC du secret d'admin, même
 * schéma que le lien « Confirm » : ops peut reconstruire le lien à tout moment
 * sans que le clair soit stocké. Bumper le label v1 révoque tous les liens.
 */
function portalToken(partnerId: number): string {
  const secret = process.env.CAR_ADMIN_SECRET;
  if (!secretOk(secret)) throw new Error("CAR_ADMIN_SECRET absent ou trop court : lien du portail impossible");
  return createHmac("sha256", secret).update(`car-portal-v1:${partnerId}`).digest("base64url");
}

/**
 * Jeton du portail du loueur. `portal_token` ne garde que son hash (spec
 * section 6) : écrit quand il manque, ou réécrit quand il ne correspond plus
 * (secret changé, ancien jeton en clair), pour que le lien rendu ouvre toujours
 * le portail. Deux appels concurrents écrivent la même valeur.
 */
export async function ensurePortalToken(partnerId: number): Promise<string> {
  const token = portalToken(partnerId);
  const hash = hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("car_partners").select("portal_token").eq("id", partnerId).maybeSingle();
  if (error) throw new Error(`ensurePortalToken(${partnerId}) lecture refusée: ${error.message}`);
  if (!data) throw new Error(`ensurePortalToken(${partnerId}): loueur introuvable`);
  if (data.portal_token === hash) return token;

  const { error: wErr } = await supabaseAdmin
    .from("car_partners").update({ portal_token: hash }).eq("id", partnerId).select("id");
  assertWritten("ensurePortalToken", partnerId, wErr);
  return token;
}

const RATE_COLS = "category, period_from, period_to, min_days, eur_per_day, source";

export async function ratesForPartner(partnerId: number): Promise<RateRow[]> {
  const { data, error } = await supabaseAdmin
    .from("car_partner_rates").select(RATE_COLS).eq("partner_id", partnerId)
    .order("category").order("period_from").order("min_days");
  if (error) throw new Error(`ratesForPartner(${partnerId}) refusé par la base: ${error.message}`);
  return (data ?? []) as unknown as RateRow[];
}

/**
 * Remplace la grille du loueur sans jamais la vider en route : upsert des lignes
 * (clé unique partner_id, category, period_from, min_days), puis suppression des
 * lignes absentes du nouvel état. Un échec transitoire laisse l'ancienne grille
 * intacte ou en partie à jour, jamais vide. Remet aussi à null le rappel d'expiration.
 */
export async function replaceRates(partnerId: number, rows: RateRow[]): Promise<void> {
  let keep: number[] = [];
  if (rows.length > 0) {
    const up = await supabaseAdmin
      .from("car_partner_rates")
      .upsert(
        rows.map((r) => ({
          partner_id: partnerId, category: r.category, period_from: r.period_from, period_to: r.period_to,
          min_days: r.min_days, eur_per_day: r.eur_per_day, source: r.source ?? null,
        })),
        { onConflict: "partner_id,category,period_from,min_days" },
      )
      .select("id");
    assertWritten("replaceRates.upsert", partnerId, up.error);
    keep = ((up.data ?? []) as Array<{ id: number }>).map((r) => r.id);
    if (keep.length !== rows.length) throw new Error(`replaceRates(${partnerId}): ${keep.length} lignes écrites sur ${rows.length}`);
  }
  let del = supabaseAdmin.from("car_partner_rates").delete().eq("partner_id", partnerId);
  if (keep.length > 0) del = del.not("id", "in", `(${keep.join(",")})`);
  const delRes = await del.select("id");
  assertWritten("replaceRates.delete", partnerId, delRes.error);
  const rem = await supabaseAdmin
    .from("car_partners").update({ rates_expiry_reminded_at: null }).eq("id", partnerId).select("id");
  assertWritten("replaceRates.reminder", partnerId, rem.error);
}

/** Catalogues des loueurs `live` et non suspendus à la date du jour (Athènes). */
export async function liveCataloguesForPartners(
  partnerIds: number[],
): Promise<Map<number, { rates: RateRow[]; conditions: CatalogueConditions | null }>> {
  const out = new Map<number, { rates: RateRow[]; conditions: CatalogueConditions | null }>();
  if (partnerIds.length === 0) return out;
  const today = todayAthens();
  const { data: partners, error } = await supabaseAdmin
    .from("car_partners").select("id, catalogue_conditions, rates_paused_until")
    .in("id", partnerIds).eq("rates_status", "live");
  if (error) throw new Error(`liveCataloguesForPartners refusé par la base: ${error.message}`);
  const live = (partners ?? []).filter(
    (p) => !p.rates_paused_until || (p.rates_paused_until as string) < today,
  );
  if (live.length === 0) return out;
  // SHORTCUT: PostgREST plafonne à 1000 lignes par défaut, environ 13 grilles complètes ; passer à une pagination ou à un count si une zone dépasse 10 loueurs à grille
  const { data: rates, error: rErr } = await supabaseAdmin
    .from("car_partner_rates").select(`partner_id, ${RATE_COLS}`).in("partner_id", live.map((p) => p.id as number));
  if (rErr) throw new Error(`liveCataloguesForPartners (grilles) refusé par la base: ${rErr.message}`);
  for (const p of live) {
    out.set(p.id as number, {
      rates: ((rates ?? []) as unknown as Array<RateRow & { partner_id: number }>)
        .filter((r) => r.partner_id === p.id)
        .map(({ partner_id: _pid, ...r }) => r),
      conditions: (p.catalogue_conditions as CatalogueConditions | null) ?? null,
    });
  }
  return out;
}

const TERMS_COLS =
  "id, name, email, phone, whatsapp, zone_ids, commission, lead_routing, active, min_days, terms_version, terms_accepted_at, default_insurance_type, default_excess_eur, default_zero_excess_upsell_eur_day";

/** Comme partnersForZone, avec les conditions 2027 et l'assurance par défaut (offres de grille). */
export async function partnersForZoneWithTerms(zoneId: string): Promise<PartnerWithTerms[]> {
  try {
    const { data, error } = await supabaseAdmin.from("car_partners")
      .select(TERMS_COLS).eq("active", true).contains("zone_ids", [zoneId]);
    if (error) { console.error("[car-catalogue-db] partnersForZoneWithTerms:", error.message); return []; }
    return (data ?? []) as PartnerWithTerms[];
  } catch (e) {
    console.error("[car-catalogue-db] partnersForZoneWithTerms (exception):", e instanceof Error ? e.message : e);
    return [];
  }
}
