// Declenchement de la demande de commission. Deux appelants, meme chemin :
// - le cron `/api/cron/car-commission-invoice`, declencheur PRINCIPAL, au
//   premier jour de la location ;
// - le back-office, au passage manuel d'une location en « rented ».
// (decision Kami 29/07/2026 : automatique, pas de geste manuel obligatoire).
//
// Ce module ne touche jamais l'argent de la location : il vend la commission au
// loueur, sur le compte plateforme, sans Connect. Voir car-commission.ts.
import { supabaseAdmin } from "./supabase-admin";
import { stripeClient } from "./stays/stripe-helpers";
import { sendPartnerCommissionRequest } from "./email";
import {
  shouldRequestCommission,
  buildCommissionCheckoutParams,
  siteBase,
  type CommissionCandidate,
} from "./car-commission";
import {
  createInvoiceForRequest,
  markInvoiceSent,
  invoiceByToken,
  assertWritten,
} from "./car-invoice-server";
import { partnerBillingIdentity, PARTNER_IDENTITY_COLS } from "./car-invoice";
import { classifyStripeFailure, stripeLogFields } from "./stripe-errors";

/**
 * Interrupteur d'armement. **Eteint par defaut, et il doit le rester** tant que
 * le systeme n'est pas juge pret : le code est deploye en production bien avant
 * que la premiere facture ne doive partir, et une facture part chez un loueur
 * reel, avec un email et un lien de paiement. Seule la valeur exacte "on" arme
 * le systeme ; toute autre valeur, y compris "true" ou "1", le laisse eteint.
 *
 * Pour l'allumer : poser CAR_COMMISSION_ENABLED=on sur Vercel **puis
 * redeployer**, la variable etant figee dans l'image du deploiement.
 */
function commissionEnabled(): boolean {
  return process.env.CAR_COMMISSION_ENABLED === "on";
}

export type CommissionOutcome =
  | { status: "requested"; invoiceNumber: string }
  /** Interrupteur eteint : rien n'a ete tente, rien n'a ete ecrit. */
  | { status: "disabled" }
  /** Rien a facturer : pas louee, deja reglee, montant sous le minimum Stripe. */
  | { status: "skipped" }
  /** Un autre appel a pris le verrou : la demande est deja partie. */
  | { status: "already_requested" }
  /**
   * Loueur identifie mais fiche legale incomplete (raison sociale, adresse,
   * TVA...). Ce n'est PAS une panne : c'est un etat normal du systeme tant que
   * la fiche partenaire n'a pas ete completee. `missing` porte les champs a
   * remplir, dans l'ordre du bloc client de la facture.
   */
  | { status: "partner_identity_incomplete"; missing: string[] }
  | { status: "failed"; code: string };

type RequestRow = CommissionCandidate & {
  final_amount_eur: number | null;
  date_from: string;
  date_to: string;
};

export async function requestCommission(requestId: number): Promise<CommissionOutcome> {
  // Premiere garde, avant toute lecture : eteint, on ne touche ni la base, ni
  // Stripe, ni la boite mail du loueur.
  if (!commissionEnabled()) return { status: "disabled" };

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, outcome, commission_eur, commission_paid_at, commission_session_id, quoted_by_partner_id, final_amount_eur, date_from, date_to",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!req || !shouldRequestCommission(req as RequestRow)) return { status: "skipped" };
  const row = req as RequestRow;

  // Identite legale du loueur, verifiee ICI, AVANT le verrou : c'est le point
  // ou convergent les deux appelants (cron et back-office), donc le seul
  // endroit ou une garde protege les deux a la fois.
  //
  // AVANT le verrou et non apres, deliberement : un loueur sans identite
  // complete n'est pas un accident isole qui justifie de poser puis relacher
  // un verrou (comme `partner_without_email` plus bas) — c'est un etat qui va
  // se represente a CHAQUE tentative tant que personne n'a rempli la fiche
  // (chaque nuit du cron, chaque nouveau clic « louée »). Le lire avant
  // d'ecrire quoi que ce soit evite un aller-retour pose/relache inutile a
  // chaque fois, et garantit qu'aucune demande ne peut rester bloquee sur un
  // verrou coince par ce refus.
  //
  // Uniquement si le partenaire EXISTE : un `quoted_by_partner_id` orphelin
  // (partenaire introuvable) n'a rien a "completer" et reste la responsabilite
  // du garde-fou historique `partner_without_email` plus bas, apres le
  // verrou — inchange, pour ne pas casser son contrat (verrou pris puis
  // relache, deja teste).
  const { data: partnerForIdentity } = await supabaseAdmin
    .from("car_partners")
    .select(PARTNER_IDENTITY_COLS)
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();
  if (partnerForIdentity) {
    const identity = partnerBillingIdentity(partnerForIdentity);
    if (!identity.ok) {
      console.error(
        "[car/commission] loueur sans identite legale complete, facturation refusee avant tout verrou",
        { requestId, partnerId: row.quoted_by_partner_id, missing: identity.missing },
      );
      return { status: "partner_identity_incomplete", missing: identity.missing };
    }
  }

  // Verrou optimiste AVANT l'appel Stripe : `commission_requested_at` passe de
  // NULL a maintenant, et seul l'appel qui remporte l'update continue. Sans lui,
  // deux clics sur « louée » creeraient deux sessions et le loueur recevrait deux
  // demandes pour la meme location.
  const { data: locked, error: lockError } = await supabaseAdmin
    .from("car_requests")
    .update({ commission_requested_at: new Date().toISOString() })
    .eq("id", requestId)
    .is("commission_requested_at", null)
    .select();
  if (lockError) {
    // Distinct d'un verrou deja pris : ici la base a REFUSE l ecriture (droits,
    // contrainte, panne reseau), le verrou n a jamais ete pose. Rendre
    // "already_requested" dirait a tort qu une autre execution a pris le relai
    // et qu il n y a rien a faire, alors que la facturation ne fonctionne plus
    // du tout. On ne relache rien : il n y a rien a relacher.
    console.error("[car/commission] verrou non pose : refus de la base par le PostgREST", {
      requestId,
      error: lockError.message,
    });
    return { status: "failed", code: "lock_write_failed" };
  }
  if (!locked || locked.length === 0) return { status: "already_requested" };

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, email")
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();

  const releaseLock = async () => {
    // Appelee UNIQUEMENT depuis des chemins d echec deja journalises. Lever ici
    // remplacerait le motif reel (le pourquoi de l echec original, le plus
    // informatif) par un simple « releaseLock refuse », et ferait planter
    // l appelant : le cron appelle requestCommission ligne par ligne SANS
    // try/catch, une exception ici ferait tomber toutes les lignes suivantes.
    // Le cout d un verrou non libere est visible et rattrapable a la main
    // (`already_requested` bloquant jusqu a reset manuel) : moins grave qu un
    // diagnostic ecrase ou qu une boucle interrompue. On journalise a part et
    // on ne leve pas.
    try {
      const { error } = await supabaseAdmin
        .from("car_requests")
        .update({ commission_requested_at: null })
        .eq("id", requestId)
        .select();
      assertWritten("releaseLock", requestId, error);
    } catch (err) {
      console.error(
        "[car/commission] verrou non libere : la demande restera bloquee en already_requested jusqu a intervention manuelle",
        { requestId, err },
      );
    }
  };

  if (!partner?.email) {
    console.error("[car/commission] loueur sans email, facturation impossible", {
      requestId,
      partnerId: row.quoted_by_partner_id,
    });
    await releaseLock();
    return { status: "failed", code: "partner_without_email" };
  }

  const mailBase = {
    requestId: row.id,
    partnerName: partner.name ?? "",
    commissionEur: row.commission_eur as number,
    finalAmountEur: Number(row.final_amount_eur) || 0,
    dateFrom: row.date_from,
    dateTo: row.date_to,
  };

  const amounts = {
    base: Number(row.final_amount_eur) || 0,
    rate: 0,
    amount: row.commission_eur as number,
  };
  amounts.rate = amounts.base > 0 ? amounts.amount / amounts.base : 0;

  let created;
  try {
    created = await createInvoiceForRequest({
      requestId: row.id,
      partnerId: row.quoted_by_partner_id as number,
      base: amounts.base,
      rate: amounts.rate,
      amount: amounts.amount,
    });
  } catch (err) {
    console.error("[car/commission] facture impossible", { requestId, err });
    await releaseLock();
    return { status: "failed", code: "invoice_creation_failed" };
  }

  // Une facture reutilisee n a plus son token en clair : elle a deja ete envoyee
  // une fois, le renvoi se fait depuis le back-office.
  if (created.reused && created.invoice.sent_at) {
    return { status: "already_requested" };
  }
  if (!created.token) {
    console.error("[car/commission] facture sans token exploitable", { requestId });
    return { status: "failed", code: "invoice_without_token" };
  }

  const invoiceUrl = `${siteBase()}/en/invoice/${created.token}`;
  const ok = await sendPartnerCommissionRequest(partner.email, {
    ...mailBase,
    payUrl: invoiceUrl,
    invoiceNumber: created.invoice.number,
  });

  if (!ok) {
    // La facture EXISTE et porte son numero : on ne la detruit pas, on la laisse
    // avec sent_at NULL, renvoyable depuis le back-office. Une facture numerotee
    // non envoyee se rattrape ; une facture envoyee non enregistree est perdue.
    console.error("[car/commission] facture creee mais email refuse", {
      requestId,
      invoice: created.invoice.number,
    });
    return { status: "failed", code: "invoice_mail_refused" };
  }

  try {
    await markInvoiceSent(created.invoice.id);
  } catch (err) {
    // L email EST parti, mais sent_at n a pas pu etre pose : le back-office
    // affichera « jamais envoyee » sur une facture recue. Rendre « requested »
    // ferait compter au cron une facture en bon ordre, alors que cet etat
    // appelle une main humaine — et un clic sur « Renvoyer » enverrait un
    // SECOND email au loueur.
    console.error("[car/commission] facture envoyee mais envoi non enregistre", {
      requestId,
      invoice: created.invoice.number,
      err,
    });
    return { status: "failed", code: "invoice_sent_not_recorded" };
  }
  return { status: "requested", invoiceNumber: created.invoice.number };
}

/**
 * Cree la session Stripe au moment ou le loueur ouvre sa facture et clique.
 * Appelee par la route de paiement, jamais par le cron : une session expire en
 * 24 h. Reutilise la session deja enregistree si elle est encore ouverte.
 */
export async function ensureCommissionCheckout(
  token: string,
): Promise<{ url: string } | { error: string }> {
  const invoice = await invoiceByToken(token);
  if (!invoice) return { error: "not_found" };
  if (invoice.paid_at) return { error: "already_paid" };
  if (invoice.credited_at) return { error: "credited" };

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("id, outcome, date_from, date_to, commission_session_id")
    .eq("id", invoice.request_id)
    .maybeSingle();
  if (!req) return { error: "not_found" };
  // Le bouton « Perdu » du back-office n emet aucun avoir : emettre une piece
  // comptable est une decision, pas un effet de bord d un clic de statut. Le
  // lien de paiement deja parti par email doit quand meme cesser d encaisser.
  if (req.outcome === "lost") return { error: "request_lost" };

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();
  if (!partner?.email) return { error: "partner_without_email" };

  if (req.commission_session_id) {
    try {
      const existing = await stripeClient().checkout.sessions.retrieve(req.commission_session_id);
      if (existing.status === "open" && existing.url) return { url: existing.url };
    } catch {
      // Session introuvable ou expiree : on en cree une neuve juste apres.
    }
  }

  let session: { id: string; url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildCommissionCheckoutParams({
        requestId: invoice.request_id,
        partnerName: partner.name ?? "",
        partnerEmail: partner.email,
        commissionEur: Number(invoice.amount_eur),
        finalAmountEur: Number(invoice.base_amount_eur),
        dateFrom: req.date_from,
        dateTo: req.date_to,
      }),
    );
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/commission] session refusee au clic", {
      invoice: invoice.number,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    return { error: failure.code };
  }

  const { error: sessionError } = await supabaseAdmin
    .from("car_requests")
    .update({ commission_session_id: session.id })
    .eq("id", invoice.request_id)
    .select();

  if (sessionError) {
    // La session Stripe EXISTE deja et vit 24 h : c est fait, irreversible sans
    // appeler Stripe. Sans son id en base, expireCommissionSession (appelee a
    // l emission d un avoir et au bouton « Perdu ») ne peut expirer QUE la
    // session enregistree : ce lien resterait vivant et non trace, rouvrant
    // exactement le defaut qu on vient de fermer. On ne peut donc pas rendre
    // cette url au loueur : on tente de tuer la session nous-memes avant de
    // rendre une erreur.
    console.error(
      "[car/commission] session Stripe creee mais non enregistree, expiration de secours",
      { invoice: invoice.number, sessionId: session.id, error: sessionError.message },
    );
    try {
      await stripeClient().checkout.sessions.expire(session.id);
    } catch (err) {
      console.error(
        "[car/commission] expiration de secours refusee : session Stripe potentiellement vivante et non tracee",
        { invoice: invoice.number, sessionId: session.id, err },
      );
    }
    return { error: "session_not_recorded" };
  }

  return session.url ? { url: session.url } : { error: "session_without_url" };
}
