// Habillage des pannes Stripe pour les deux endpoints qui appellent l'API en
// synchrone : /api/stays/approve (creation du compte Connect du proprietaire) et
// /api/stays/pay-balance (session de paiement du solde). Regle : le navigateur
// recoit une phrase ecrite par nous, jamais un fragment de reponse Stripe ; le
// serveur, lui, garde de quoi retrouver la requete dans le journal Stripe.

export type StaysStripeFailureCode = "payouts_unavailable" | "payment_provider";

export interface StaysStripeFailure {
  code: StaysStripeFailureCode;
  /** Statut HTTP a renvoyer. Jamais 500 : la panne est en aval, pas chez nous. */
  status: number;
  /** Repli lisible, en francais. Le client localise a partir de `code`. */
  message: string;
}

const MESSAGES: Record<StaysStripeFailureCode, string> = {
  payouts_unavailable:
    "Les versements aux propriétaires ne sont pas encore ouverts. Votre demande est conservée, elle n'est pas perdue : nous revenons vers vous dès que le compte de versement est actif.",
  payment_provider:
    "Le paiement est momentanément indisponible. Réessayez dans quelques minutes ; si cela persiste, écrivez à contact@crete.direct.",
};

function readMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "";
}

/**
 * Les refus de plateforme de versement se reconnaissent au texte de Stripe : il
 * n'existe pas de `code` machine pour eux. Deux formes rencontrees en live le
 * 29/07/2026, dans cet ordre :
 *  1. Connect pas active du tout (`req_LTgM8Q2P3wMWA8`)
 *  2. Connect active mais questionnaire plateforme non rempli (`req_CfO14aOa3mLv1M`)
 * Les deux bloquent le versement et meritent le meme message : ce n'est pas une
 * panne du prestataire, c'est notre plateforme qui n'est pas encore ouverte.
 */
const PAYOUTS_BLOCKED = /signed up for Connect|complete your platform profile/i;

export function classifyStripeFailure(err: unknown): StaysStripeFailure {
  const raw = readMessage(err);
  const code: StaysStripeFailureCode = PAYOUTS_BLOCKED.test(raw)
    ? "payouts_unavailable"
    : "payment_provider";
  return {
    code,
    status: code === "payouts_unavailable" ? 503 : 502,
    message: MESSAGES[code],
  };
}

/** Champs a joindre au `console.error` du serveur. Ne jamais serialiser vers le client. */
export function stripeLogFields(err: unknown): Record<string, unknown> {
  const e = (err && typeof err === "object" ? err : {}) as Record<string, unknown>;
  return {
    stripeType: e.type,
    stripeCode: e.code,
    stripeStatus: e.statusCode,
    stripeRequestId: e.requestId,
    stripeMessage: readMessage(err),
  };
}
