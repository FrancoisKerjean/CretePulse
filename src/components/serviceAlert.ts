import type { BusAlert } from "@/lib/bus-alerts";

type Dict = Record<string, string>;

export const ALERT_I18N = {
  labelAlerte: { en: "Service alert", fr: "Alerte service", de: "Betriebsmeldung", el: "Ειδοποίηση" },
  labelAlertes: { en: "service alerts", fr: "alertes service", de: "Betriebsmeldungen", el: "ειδοποιήσεις" },
  voir: { en: "view", fr: "voir", de: "ansehen", el: "προβολή" },
  toggleAria: {
    en: "Toggle alert details", fr: "Afficher le détail de l'alerte",
    de: "Meldungsdetails ein-/ausblenden", el: "Εναλλαγή λεπτομερειών ειδοποίησης",
  },
  sourceRoute: {
    en: "Click to read the official notice before travelling.",
    fr: "Cliquez pour lire l'avis officiel avant de partir.",
    de: "Vor der Reise den offiziellen Hinweis lesen.",
    el: "Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
  sourceGlobal: {
    en: "From KTEL Heraklion-Lasithi announcements. Click to read the official notice before travelling.",
    fr: "Annonces KTEL Héraklion-Lassithi. Cliquez pour lire l'avis officiel avant de partir.",
    de: "Meldungen von KTEL Heraklion-Lasithi. Vor der Fahrt die offizielle Mitteilung lesen.",
    el: "Ανακοινώσεις ΚΤΕΛ Ηρακλείου-Λασιθίου. Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
} satisfies Record<string, Dict>;

export const trAlert = (m: Dict, locale: string): string => m[locale] ?? m.en;

/** Texte de la ligne repliée (en-tête). Vide si aucune alerte. */
export function alertSummary(alerts: BusAlert[], locale: string): string {
  if (alerts.length === 0) return "";
  if (alerts.length === 1) {
    const a = alerts[0];
    const ctx = a.matched_routes && a.matched_routes.length
      ? a.matched_routes.join(" · ")
      : a.title;
    return `${trAlert(ALERT_I18N.labelAlerte, locale)} · ${ctx}`;
  }
  return `${alerts.length} ${trAlert(ALERT_I18N.labelAlertes, locale)} · ${trAlert(ALERT_I18N.voir, locale)}`;
}

/** Ligne source (attribution KTEL) selon le variant. */
export const alertSource = (variant: "global" | "route", locale: string): string =>
  trAlert(variant === "route" ? ALERT_I18N.sourceRoute : ALERT_I18N.sourceGlobal, locale);
