// Portail loueur : identité de facturation, grille de prix, conditions 2027.
// Auth = jeton du lien privé (champ `token` du corps). Une seule route, une
// action par appel. ⛔ PostgREST ne lève jamais : chaque écriture lit `error`.
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertWritten } from "@/lib/car-invoice-server";
import { partnerBillingIdentity } from "@/lib/car-invoice";
import { buildIdentityPatch, IDENTITY_TEXT_FIELDS, todayAthens, type IdentityTextField } from "@/lib/car-partner-identity";
import { CAR_TERMS_VERSION, isPartnerBookable, validateConditionsInput, validateRatesInput } from "@/lib/car-catalogue";
import { partnerByPortalToken, ratesForPartner, replaceRates, type PortalPartner } from "@/lib/car-catalogue-db";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealIsoDate = (s: unknown): s is string =>
  typeof s === "string" && ISO_DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

async function patchPartner(op: string, id: number, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin.from("car_partners").update(patch).eq("id", id).select();
  assertWritten(op, id, error);
}

const ok = () => NextResponse.json({ ok: true });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("Invalid body");
    body = raw as Record<string, unknown>;
  } catch {
    return bad("Invalid body");
  }
  if (typeof body.token !== "string" || !body.token || typeof body.action !== "string") return bad("Invalid body");

  const partner: PortalPartner | null = await partnerByPortalToken(body.token);
  if (!partner) return bad("Not found", 404);

  try {
    switch (body.action) {
      case "save_identity": {
        const input = (body.values && typeof body.values === "object" ? body.values : {}) as Record<string, unknown>;
        const values: Partial<Record<IdentityTextField, string>> = {};
        for (const f of IDENTITY_TEXT_FIELDS) values[f] = typeof input[f] === "string" ? (input[f] as string).slice(0, 200) : "";
        // Le loueur ne crée jamais d'attestation VIES : elle ne survit que si le
        // numéro de TVA est inchangé (même normalisation que le stockage).
        const norm = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, "").toUpperCase() : "");
        const unchanged = norm(values.vat_id) === norm(partner.vat_id);
        const patch = buildIdentityPatch({
          values, vatVerified: unchanged && !!partner.vat_verified_at, current: partner, today: todayAthens(),
        });
        await patchPartner("portal.save_identity", partner.id, patch);
        return ok();
      }

      case "save_rates": {
        const rates = validateRatesInput(body.rows);
        const cond = validateConditionsInput(body.conditions);
        const errors = [...(rates.ok ? [] : rates.errors), ...(cond.ok ? [] : cond.errors)];
        if (!rates.ok || !cond.ok) return NextResponse.json({ ok: false, errors }, { status: 400 });
        await replaceRates(partner.id, rates.rows);
        const patch: Record<string, unknown> = { catalogue_conditions: cond.conditions };
        if (partner.rates_status === "none") patch.rates_status = "draft";
        await patchPartner("portal.save_rates", partner.id, patch);
        return ok();
      }

      case "accept_terms": {
        const identity = partnerBillingIdentity(partner);
        if (!identity.ok) return NextResponse.json({ ok: false, missing: identity.missing }, { status: 422 });
        const patch: Record<string, unknown> = {
          terms_version: CAR_TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        };
        if (body.publish === true) {
          if ((await ratesForPartner(partner.id)).length === 0) return bad("Add at least one price line first", 422);
          patch.rates_status = "live";
          patch.rates_published_at = new Date().toISOString();
        }
        await patchPartner("portal.accept_terms", partner.id, patch);
        return ok();
      }

      case "pause": {
        if (!isRealIsoDate(body.until) || body.until < todayAthens()) return bad("Invalid date");
        await patchPartner("portal.pause", partner.id, { rates_status: "paused", rates_paused_until: body.until });
        return ok();
      }

      case "resume": {
        const canBeLive = isPartnerBookable(partner) && (await ratesForPartner(partner.id)).length > 0;
        await patchPartner("portal.resume", partner.id, {
          rates_paused_until: null,
          rates_status: canBeLive ? "live" : "draft",
        });
        return ok();
      }

      default:
        return bad("Unknown action");
    }
  } catch (e) {
    console.error("[car-rental/partner-portal] failed:", e);
    return bad("Could not save, please try again", 500);
  }
}
