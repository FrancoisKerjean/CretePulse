// Mesure de l'ouverture de la page d'offres. La page est un Server Component :
// sans ce petit client, aucun evenement ne peut partir, et c'est exactement l'etat
// dans lequel elle a vecu jusqu'ici (zero event sur tout le tunnel aval).
//
// Les props sont calculees COTE SERVEUR (src/lib/car-offer-metrics.ts) et passees
// telles quelles : ce composant n'a aucune logique, il emet.
"use client";
import { useEffect, useRef } from "react";
import type { OfferViewProps } from "@/lib/car-offer-metrics";

/**
 * Garde de session. Deux raisons, et la seconde est celle qui compte :
 * 1. React 19 monte deux fois en developpement (Strict Mode).
 * 2. `Car Wizard Submit` a montre ce que coute une mesure ambigue : 66 events
 *    pour 33 demandes, parce qu'il en emet un a la tentative ET un au succes.
 *    Ici UNE ouverture doit valoir UN event, sinon le taux d'ouverture, qui est
 *    toute la question posee, se lit au double.
 * La cle porte un prefixe court du jeton, pas le jeton entier : de quoi
 * distinguer deux demandes sans recopier un secret dans le stockage.
 */
function guardKey(token: string): string {
  return `cd_offer_seen_${token.slice(0, 8)}`;
}

export function OfferBeacon({ token, props }: { token: string; props: OfferViewProps }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    try {
      const key = guardKey(token);
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible (navigation privee stricte) : on mesure quand meme.
      // Une vue comptee deux fois vaut mieux qu'un client invisible.
    }
    window.plausible?.("car_offer_viewed", { props });
  }, [token, props]);
  return null;
}
