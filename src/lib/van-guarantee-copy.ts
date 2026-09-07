// Phrase du bloc VanPromo : le prix par place, puis ce qui arrive sous le
// seuil, dit AVANT le clic. Le seuil et le plafond viennent du corridor,
// jamais d'une constante : sans coût connu le corridor reste en « on vous
// prévient, annulation sans frais » et la phrase ne promet aucun plafond.
//
// Source de vérité : van-crete-direct/src/lib/i18n.ts (NOTICE_WITH_CAP,
// NOTICE_NO_CAP, fonction guaranteeNotice), copiée mot pour mot le
// 07/09/2026. Dépôt séparé, même texte, à tenir en phase : le test
// van-guarantee-copy.test.ts rougit si fr ou en s'en écarte.
import type { VanCorridor } from "./van-corridors";

const LINE: Record<string, { from: string; withCap: string; noCap: string }> = {
  en: {
    from: "From {p} € per seat · licensed local driver · ",
    withCap: "At {n} travellers the van departs at the displayed price. Below that, 2 days before departure, we offer you either a guaranteed departure at a price shared between the travellers who joined (at most {cap} € for the vehicle), or cancellation at no cost. Nothing is charged online.",
    noCap: "At {n} travellers the van departs at the displayed price. Below that, 2 days before departure, we let you know if the van does not depart. Nothing is charged.",
  },
  fr: {
    from: "Dès {p} € par place · chauffeur local licencié · ",
    withCap: "À {n} voyageurs, le van part au tarif affiché. En dessous, 2 jours avant le départ, nous vous proposons soit un départ garanti au tarif partagé entre les inscrits (au plus {cap} € pour le véhicule), soit l'annulation sans frais. Rien n'est prélevé en ligne.",
    noCap: "À {n} voyageurs, le van part au tarif affiché. En dessous, 2 jours avant le départ, nous vous prévenons si le van ne part pas. Rien n'est prélevé.",
  },
  de: {
    from: "Ab {p} € pro Platz · lizenzierter lokaler Fahrer · ",
    withCap: "Ab {n} Reisenden fährt der Van zum angezeigten Preis. Darunter bieten wir Ihnen 2 Tage vor der Abfahrt entweder eine garantierte Abfahrt zu einem unter den Angemeldeten geteilten Preis (höchstens {cap} € für das Fahrzeug) oder die kostenlose Stornierung an. Online wird nichts abgebucht.",
    noCap: "Ab {n} Reisenden fährt der Van zum angezeigten Preis. Darunter sagen wir Ihnen 2 Tage vor der Abfahrt Bescheid, falls der Van nicht fährt. Es wird nichts abgebucht.",
  },
  el: {
    from: "Από {p} € ανά θέση · αδειοδοτημένος τοπικός οδηγός · ",
    withCap: "Με {n} ταξιδιώτες το βαν φεύγει στην αναγραφόμενη τιμή. Με λιγότερους, 2 ημέρες πριν την αναχώρηση, σας προτείνουμε είτε εγγυημένη αναχώρηση με κόστος μοιρασμένο στους εγγεγραμμένους (το πολύ {cap} € για το όχημα), είτε ακύρωση χωρίς χρέωση. Δεν γίνεται καμία online χρέωση.",
    noCap: "Με {n} ταξιδιώτες το βαν φεύγει στην αναγραφόμενη τιμή. Με λιγότερους, 2 ημέρες πριν την αναχώρηση, σας ενημερώνουμε αν το βαν δεν φύγει. Δεν γίνεται καμία χρέωση.",
  },
};

/** Les 18 autres locales de crete.direct tombent sur l'anglais, comme le
 *  reste de VanPromo (van.crete.direct ne parle que ces 4 langues). */
export function vanPromoLine(locale: string, c: VanCorridor): string {
  const l = LINE[locale] ?? LINE.en;
  const tail = c.guaranteeCapEur === null ? l.noCap : l.withCap;
  return (l.from + tail)
    .replace("{p}", String(c.priceEur))
    .replace("{n}", String(c.threshold))
    .replace("{cap}", String(c.guaranteeCapEur ?? ""));
}
