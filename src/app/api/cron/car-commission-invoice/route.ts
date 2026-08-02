// Facturation automatique de la commission au premier jour de location.
// Remplace le clic « louée » du back-office comme declencheur : celui-ci reste
// disponible et emprunte exactement le meme chemin.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { assertCron } from "@/lib/cron-auth";
import {
  isInvoiceable,
  invoiceAmounts,
  partnerBillingIdentity,
  PARTNER_IDENTITY_COLS,
  type InvoiceCandidate,
} from "@/lib/car-invoice";
import { requestCommission } from "@/lib/car-commission-server";
import { siteBase } from "@/lib/car-commission";
import { notifyOps } from "@/lib/ops-notify";

export const dynamic = "force-dynamic";

/**
 * Libelle de chaque motif de rejet, en francais et actionnable. Le code brut
 * (`partner_identity_incomplete`) reste dans la reponse JSON, qui est un contrat
 * machine ; ce qui arrive chez Kami doit dire quoi faire.
 */
const MOTIFS: Record<string, string> = {
  partner_not_found: "loueur introuvable en base",
  no_commission_rate: "aucun taux de commission configure",
  partner_identity_incomplete: "fiche legale incomplete",
  below_minimum: "commission sous le minimum encaissable Stripe",
  outcome_update_failed: "la base a refuse la bascule en « louee »",
};

/** Une ligne ecartee, telle qu elle se lit dans le fil Telegram. */
interface Ecartee {
  id: number;
  reason: string;
  partner?: string;
  missing?: string[];
}

function ligneEcartee(e: Ecartee): string {
  const motif = MOTIFS[e.reason] ?? e.reason.replace(/^commission_failed:/, "echec facturation : ");
  const qui = e.partner ? ` ${e.partner}` : "";
  const quoi = e.missing?.length ? ` (${e.missing.join(", ")})` : "";
  return `#${e.id}${qui} : ${motif}${quoi}`;
}

/**
 * Borne de mise en service. SANS ELLE le premier tir rattrape tout
 * l historique et refacture des locations deja facturees a la main.
 * Ne jamais la reculer.
 */
const START = process.env.COMMISSION_INVOICING_START || "2026-08-05";

/**
 * Garde d armement, testee ICI et pas seulement dans requestCommission.
 * Un interrupteur qui protege deux appelants doit etre verifie par chacun, et
 * un systeme desarme n ecrit RIEN, pas meme un champ d etat.
 */
function enabled(): boolean {
  return process.env.CAR_COMMISSION_ENABLED === "on";
}

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;
  if (!enabled()) return NextResponse.json({ disabled: true });

  // 05:00 UTC = 08:00 a Athenes : meme jour civil des deux cotes. Deplacer ce
  // cron en soiree UTC facturerait un jour trop tot cote grec.
  const today = new Date().toISOString().slice(0, 10);

  // ⛔ `outcome IS NULL` EST le filtre d idempotence, et le seul. Ce cron tranche
  // l issue en « rented » AVANT d appeler la facturation, et AUCUN chemin du
  // depot ne remet `outcome` a NULL : une ligne facturee, ou seulement tentee,
  // sort donc definitivement du lot des le passage suivant. Corollaire : une
  // ligne remontee ici n a jamais de facture, il est inutile d aller le
  // verifier. Si un geste futur remet `outcome` a NULL (bouton « annuler
  // l issue »), il DEVRA verifier l existence d une facture avant de refacturer.
  // Ce n est pas `commission_requested_at` qui protege : releaseLock() le remet
  // a NULL. Le rattrapage d un envoi rate est le bouton « Renvoyer » du
  // back-office, jamais un second passage du cron.
  const { data: rows } = await supabase
    .from("car_requests")
    .select(
      "id, accepted_at, outcome, date_from, booking_paid_at, quoted_by_partner_id, quoted_price",
    )
    .not("accepted_at", "is", null)
    .is("outcome", null)
    .is("booking_paid_at", null)
    .lte("date_from", today)
    .gte("date_from", START);

  let invoiced = 0;
  // Un identifiant nu ne dit pas POURQUOI la ligne est sortie du lot, et trois
  // causes tres differentes s y melangeaient. Chaque rejet porte donc son motif,
  // stable et lisible sans relire la base.
  const skipped: Ecartee[] = [];

  for (const row of (rows ?? []) as InvoiceCandidate[]) {
    if (!isInvoiceable(row, today, START)) continue;

    const { data: partner } = await supabase
      .from("car_partners")
      // `name` n entre dans aucune facture : il sert uniquement a ce que
      // l alerte nomme le loueur. Un « #42 » nu n appelle aucune action.
      .select(`name, commission, ${PARTNER_IDENTITY_COLS}`)
      .eq("id", row.quoted_by_partner_id as number)
      .maybeSingle();
    if (!partner) { skipped.push({ id: row.id, reason: "partner_not_found" }); continue; }

    const nom = typeof partner.name === "string" ? partner.name : undefined;

    // Un taux absent devient 0 en passant par Number(), et une commission de 0
    // tombe sous le minimum Stripe : le loueur sans taux configure partait donc
    // en « below_minimum » et se lisait comme une toute petite location. Les deux
    // causes n appellent pas la meme main, elles ne partagent plus le meme motif.
    const rate = Number(partner.commission);
    if (!Number.isFinite(rate) || rate <= 0) {
      skipped.push({ id: row.id, reason: "no_commission_rate", partner: nom });
      continue;
    }

    // ⛔ Identite legale du loueur, verifiee AVANT toute ecriture, et notamment
    // avant la bascule en « rented ». Deux raisons, dans cet ordre :
    //
    // 1. NovAI est francaise, le loueur est grec : la commission est une
    //    prestation de services intra-UE, autoliquidee par le preneur. La piece
    //    DOIT porter le numero de TVA du client et son adresse complete. Sans
    //    elles, ce qui partirait chez une vraie entreprise ne serait pas une
    //    facture. Mieux vaut ne rien emettre.
    // 2. `outcome IS NULL` EST le filtre d idempotence de ce cron. Ecarter la
    //    ligne APRES la bascule la sortirait DEFINITIVEMENT du lot : la location
    //    ne serait jamais facturee, meme une fois la fiche loueur remplie. Ici,
    //    elle ressortira d elle-meme au passage suivant.
    const identity = partnerBillingIdentity(partner);
    if (!identity.ok) {
      console.error("[car/commission-cron] identite legale du loueur incomplete, rien n est emis", {
        requestId: row.id,
        partnerId: row.quoted_by_partner_id,
        missing: identity.missing,
      });
      skipped.push({
        id: row.id,
        reason: "partner_identity_incomplete",
        partner: nom,
        missing: identity.missing,
      });
      continue;
    }

    const amounts = invoiceAmounts(row.quoted_price as number, rate);
    if (!amounts) { skipped.push({ id: row.id, reason: "below_minimum", partner: nom }); continue; }

    // Bascule AVANT l appel : shouldRequestCommission exige outcome === "rented".
    const { error: outcomeError } = await supabase
      .from("car_requests")
      .update({
        outcome: "rented",
        outcome_at: new Date().toISOString(),
        final_amount_eur: amounts.base,
        commission_eur: amounts.amount,
      })
      .eq("id", row.id)
      .select();

    if (outcomeError) {
      // Auto-guerissant au passage suivant : `outcome` reste NULL, la ligne
      // ressort du meme filtre demain (voir la note plus haut). Mais appeler
      // quand meme requestCommission ici serait pour rien (shouldRequestCommission
      // exige outcome === "rented", donc "skipped"), et journaliserait un motif
      // opaque `commission_failed:skipped` qui fait chercher une regle metier
      // la ou il y a un refus base. Une ligne en echec ne doit pas faire tomber
      // les suivantes : on journalise le vrai motif et on continue la boucle.
      console.error("[car/commission-cron] bascule outcome=rented refusee par la base", {
        requestId: row.id,
        error: outcomeError.message,
      });
      skipped.push({ id: row.id, reason: "outcome_update_failed", partner: nom });
      continue;
    }

    const res = await requestCommission(row.id);
    if (res.status === "requested") invoiced += 1;
    else {
      // Le code d echec REEL, pas un « ca n a pas marche » : c est lui qui
      // separe un email refuse par Resend d un loueur sans adresse.
      const detail = res.status === "failed" ? res.code : res.status;
      skipped.push({ id: row.id, reason: `commission_failed:${detail}`, partner: nom });
    }
  }

  // ⛔ Le passage doit PARLER. Sans ce bloc, une commission ecartee ne vit que
  // dans la reponse HTTP d un cron que personne n ouvre et dans un console.error
  // noye dans les journaux Vercel : elle repasserait chaque nuit, invisible,
  // jusqu a ce que la location soit oubliee. C est precisement l oubli que ce
  // systeme existe pour empecher.
  //
  // Le rappel est VOLONTAIREMENT quotidien tant que la ligne est bloquee : elle
  // se tait d elle-meme des que la fiche loueur est remplie, donc le bruit a une
  // sortie evidente. Rien a dire (ni facture, ni rejet) = silence total.
  if (invoiced > 0 || skipped.length > 0) {
    const titre = [
      invoiced > 0 ? `${invoiced} facture(s) de commission emise(s)` : null,
      skipped.length > 0 ? `${skipped.length} ligne(s) NON facturee(s)` : null,
    ]
      .filter(Boolean)
      .join(", ");
    try {
      await notifyOps({
        title: `Commission voiture : ${titre}`,
        lines: skipped.map(ligneEcartee),
        action: skipped.length
          ? "Completer la fiche du loueur dans le back-office. La ligne repart au passage suivant, aucune commission n est perdue."
          : undefined,
        url: `${siteBase()}/admin/car-rental`,
        // Une facture partie sans incident n a pas a reveiller : c est le blocage
        // qui appelle une main.
        silent: skipped.length === 0,
      });
    } catch (e) {
      // Telegram est un canal de confort. Son echec ne doit jamais faire perdre
      // le resultat d une facturation deja ecrite en base.
      console.error("[car/commission-cron] notification d exploitation echouee", e);
    }
  }

  return NextResponse.json({ invoiced, skipped, today, start: START });
}
