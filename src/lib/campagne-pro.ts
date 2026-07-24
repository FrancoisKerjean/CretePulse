// Types + helpers partages des pages /projet pro (institutions, entreprises).
// Node-safe (aucun import react/next) pour etre testable par check-projet-copy.mjs.
import { getInstitutionsCopyFR, getInstitutionsCopyEN, getInstitutionsCopyEL } from "./campagne-institutions.ts";
import { getEntreprisesCopyFR, getEntreprisesCopyEN, getEntreprisesCopyEL } from "./campagne-entreprises.ts";

export const PRO_AUDIENCES = ["visiteur", "institutions", "entreprises"] as const;
export type ProAudience = (typeof PRO_AUDIENCES)[number];

// Variantes de pastille reutilisant celles de Card (terracotta | go | calm).
export type ProKicker = "terracotta" | "go" | "calm";
// Scenes existantes reutilisables (BeatRow.SCENES).
export type SceneKey = "terminal" | "busStop" | "signpost" | "phoneLive" | "summit" | "app" | "community";

export type ProStat = { n: string; l: string };
export type ProBeat = {
  id: string;
  kicker: string;
  kickerVariant: ProKicker;
  scene?: SceneKey;     // illustration reutilisee...
  emoji?: string;       // ...ou simple boite emoji
  emojiCap?: string;
  title: string;        // peut contenir <hl>...</hl>
  body?: string;
  flip?: boolean;       // scene a droite
};
export type ProFriseStep = { year: string; title: string; text: string; future?: boolean };
export type ProDoor = { id: string; emoji: string; title: string; body: string; cta: string; href: string };
export type ProFormField = { name: string; label: string; type?: "text" | "email" | "textarea"; required?: boolean; placeholder?: string };

export type ProCopy = {
  audience: ProAudience;
  meta: { title: string; description: string };
  hero: { kicker: string; kickerVariant: ProKicker; title: string; sub?: string };
  stats: ProStat[];
  hook?: string;
  beats: ProBeat[];
  frise: { kicker: string; title: string; sub?: string; steps: ProFriseStep[] };
  ask?: { kicker: string; title: string; body: string; dossierLabel: string; dossierHref: string };
  doors?: ProDoor[];
  form: {
    variant: "institution" | "sponsor";
    title: string; lead: string;
    fields: ProFormField[];
    submit: string; sending: string; sent: string; error: string;
  };
};

// Libelles du selecteur de public (FR/EN), partages par les 3 routes.
export const AUDIENCE_LABELS: Record<string, Record<ProAudience, string>> = {
  fr: { visiteur: "Visiteur", institutions: "Institution", entreprises: "Entreprise" },
  en: { visiteur: "Visitor", institutions: "Institution", entreprises: "Business" },
  el: { visiteur: "Επισκέπτης", institutions: "Θεσμός", entreprises: "Επιχείρηση" },
};
export function audienceLabels(locale: string): Record<ProAudience, string> {
  return AUDIENCE_LABELS[locale] ?? AUDIENCE_LABELS.en;
}

export function getInstitutionsCopy(locale: string): ProCopy {
  if (locale === "fr") return getInstitutionsCopyFR();
  if (locale === "el") return getInstitutionsCopyEL();
  return getInstitutionsCopyEN();
}
export function getEntreprisesCopy(locale: string): ProCopy {
  if (locale === "fr") return getEntreprisesCopyFR();
  if (locale === "el") return getEntreprisesCopyEL();
  return getEntreprisesCopyEN();
}
