// Encart partenaire location de voiture (PromoBox, pattern unique du site).
// CTA interne vers le wizard /car-rental, ?pickup= contextuel optionnel.
// Affiché UNIQUEMENT là où le contexte est pertinent ; en zone non couverte,
// passer pickup=undefined (le wizard ouvre à l'étape 1).
// Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md (§5)
import { Car } from "lucide-react";
import { PromoBox } from "@/components/PromoBox";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";

// Disclosure sans mention de commission (decision Kami 12/06) : la pastille
// dit "Partenaire local", point. Pas de tiret cadratin (regle Kairos).
const COPY: Record<string, { title: string; line: string; cta: string; disclosure: string }> = {
  en: {
    title: "Need a car?",
    line: "Local partner agency · fair price, no prepayment, cash welcome",
    cta: "Get a quote",
    disclosure: "Local partner",
  },
  fr: {
    title: "Besoin d'une voiture ?",
    line: "Agence partenaire locale · prix juste, aucun prépaiement, espèces acceptées",
    cta: "Obtenir un devis",
    disclosure: "Partenaire local",
  },
  de: {
    title: "Mietwagen gesucht?",
    line: "Lokale Partneragentur · fairer Preis, keine Vorauszahlung, Barzahlung willkommen",
    cta: "Angebot anfordern",
    disclosure: "Lokaler Partner",
  },
  el: {
    title: "Χρειάζεστε αυτοκίνητο;",
    line: "Τοπικό συνεργαζόμενο γραφείο · δίκαιη τιμή, καμία προπληρωμή, δεκτά μετρητά",
    cta: "Ζητήστε προσφορά",
    disclosure: "Τοπικός συνεργάτης",
  },
};

export function CarPromo({
  locale,
  pickup,
  source,
}: {
  locale: string;
  /** Slug de pickup contextuel (doit appartenir à une zone car-partners), sinon étape 1. */
  pickup?: string;
  /** Page d'origine, tracée par le wizard (prop source des events Plausible). */
  source?: string;
}) {
  const c = COPY[locale] || COPY.en;
  const params = new URLSearchParams();
  if (pickup) params.set("pickup", pickup);
  if (source) params.set("source", source);
  const qs = params.toString();
  return (
    <>
      {/* Capture décisionnelle : impression du bloc Auto Smart (CTR vs Car
          Wizard Step, pathname attaché par Plausible). */}
      <ImpressionTracker event="promo_impression" props={{ block: "car-promo", source: source ?? "" }} />
      <PromoBox
        icon={Car}
        title={c.title}
        line={c.line}
        ctaLabel={c.cta}
        ctaHref={`/${locale}/car-rental${qs ? `?${qs}` : ""}`}
        disclosure={c.disclosure}
        photo="/images/partners/car-rental.jpg"
      />
    </>
  );
}
