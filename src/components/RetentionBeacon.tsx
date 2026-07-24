// src/components/RetentionBeacon.tsx : lot 0 app compagnon.
// Envoie UNE FOIS par session l'event Plausible "retention" avec des props
// catégorielles (aucun identifiant). État = localStorage du visiteur.
// Remplace le RetentionTracker du 10/07 (convergence multi-terminal) : même
// intention, mais logique pure testée (check:retention) et émission aussi sur
// new/same_day pour donner le dénominateur nouveaux vs revenants dans Plausible.
"use client";
import { useEffect } from "react";
import { computeRetention, RETENTION_STORAGE_KEY } from "@/lib/retention";

const SESSION_GUARD = "cd_r_sent";

export function RetentionBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_GUARD)) return;
      const { props, next } = computeRetention(
        localStorage.getItem(RETENTION_STORAGE_KEY),
        Date.now(),
      );
      localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(next));
      sessionStorage.setItem(SESSION_GUARD, "1");
      window.plausible?.("retention", { props });
    } catch {
      // localStorage indisponible (navigation privée stricte) : on ne mesure pas, on ne casse rien.
    }
  }, []);
  return null;
}
