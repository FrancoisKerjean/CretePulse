// Garde-fou de lecture des reponses Resend.
//
// Le piege : le SDK Resend ne leve PAS quand l'API refuse un envoi (domaine non
// verifie, rate limit, cle revoquee, destinataire invalide). Il resout avec
// { data: null, error: { name, message } }. Un `await resend.emails.send(...)`
// qui n'inspecte pas la reponse traite donc un refus exactement comme un
// succes : l'email est perdu, et meme un try/catch autour ne voit rien.
//
// Deux usages, selon la criticite de l'envoi :
//   assertSent  → envoi critique, on propage l'echec a l'appelant.
//   reportSend  → envoi best-effort, on journalise et on rend un booleen.

export interface ResendResponse<T = { id?: string }> {
  data?: T | null;
  error?: { name?: string; message?: string } | null;
}

function describe(res: ResendResponse<unknown>): string {
  return res.error?.message ?? res.error?.name ?? "erreur Resend inconnue";
}

/** Envoi critique : leve si Resend a refuse, rend les donnees sinon. */
export function assertSent<T>(res: ResendResponse<T>, label: string): T | null | undefined {
  if (res?.error) {
    throw new Error(`Resend (${label}) : ${describe(res)}`);
  }
  return res?.data;
}

/** Envoi best-effort : journalise un refus et rend false, true si accepte. */
export function reportSend(res: ResendResponse<unknown>, label: string): boolean {
  if (res?.error) {
    console.error(`[resend] ${label} refuse par l'API :`, describe(res));
    return false;
  }
  return true;
}
