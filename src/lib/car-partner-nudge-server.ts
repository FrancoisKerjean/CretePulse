// Passe de relance des loueurs muets, partagée par deux crons.
//
// Elle vivait en clair dans `cron/car-relance`, qui ne tourne qu'à 9h00. Depuis
// que le seuil est passé à H+2 (cf PARTNER_NUDGE_DELAY_MS), il faut une
// exécution horaire : `cron/car-partner-nudge`. Les deux appellent CE module
// plutôt que d'en garder chacun une copie, sinon les deux versions divergent au
// premier correctif.
//
// `car-relance` reste un filet : si la passe horaire tombe, la passe de 9h
// rattrape les invites restées sans relance.
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { partnerNeedsRelance } from "@/lib/car-quotes";
import { newToken, hashToken, siteBase } from "@/lib/car-quote";
import { partnerById } from "@/lib/car-partners-db";

export interface PartnerNudgeResult {
  partnersRelanced: number;
}

/**
 * Relance chaque loueur invité qui n'a pas chiffré depuis le délai, une fois et
 * une seule. Ne relance jamais sur une location déjà commencée : la demande est
 * morte de fait.
 */
export async function runPartnerNudgePass(nowMs: number): Promise<PartnerNudgeResult> {
  const startInFuture = (dateFrom: string | null | undefined): boolean =>
    dateFrom ? new Date(dateFrom + "T00:00:00").getTime() > nowMs : true;

  const { sendPartnerRelance } = await import("@/lib/email");

  let partnersRelanced = 0;
  const { data: invites } = await supabase.from("car_quote_invites")
    .select("id, request_id, partner_id, status, relanced_at, created_at, car_requests(status, date_from)")
    .eq("status", "invited")
    .is("relanced_at", null);

  for (const inv of invites ?? []) {
    const raw = (inv as { car_requests?: unknown }).car_requests;
    const reqRow = (Array.isArray(raw) ? raw[0] : raw) as { status?: string; date_from?: string } | undefined;
    if (!reqRow?.status) continue;
    if (!startInFuture(reqRow.date_from)) continue;
    if (!partnerNeedsRelance(
      { status: inv.status, relanced_at: inv.relanced_at },
      reqRow.status, nowMs, new Date(inv.created_at).getTime(),
    )) continue;

    const partner = await partnerById(inv.partner_id);
    if (!partner?.email) continue;
    // Token loueur rotatif : le clair n'est pas récupérable depuis le hash. On
    // marque relanced_at AVANT l'envoi → jamais de double relance même si l'email
    // échoue (best-effort, 1× garanti).
    const qToken = newToken();
    await supabase.from("car_quote_invites").update({
      quote_token_hash: hashToken(qToken), relanced_at: new Date().toISOString(),
    }).eq("id", inv.id);
    try {
      await sendPartnerRelance(partner.email, partner.name, `${siteBase()}/en/car-quote/${qToken}`);
      partnersRelanced++;
    } catch (e) { console.error("[car-partner-nudge] partner relance failed", inv.id, e); }
  }

  return { partnersRelanced };
}
