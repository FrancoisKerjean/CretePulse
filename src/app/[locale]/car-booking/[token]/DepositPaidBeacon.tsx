// Mesure du retour de Stripe après paiement de l'acompte (`?paid=1`).
// Même garde que OfferBeacon : UN retour vaut UN événement, même si le client
// actualise la page en attendant la confirmation du loueur.
"use client";
import { useEffect, useRef } from "react";

export function DepositPaidBeacon({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    try {
      // Préfixe court du jeton : de quoi distinguer deux réservations sans
      // recopier un secret dans le stockage.
      const key = `cd_deposit_paid_${token.slice(0, 8)}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible : on mesure quand même, un paiement compté deux
      // fois vaut mieux qu'un paiement invisible.
    }
    window.plausible?.("car_deposit_paid");
  }, [token]);
  return null;
}
