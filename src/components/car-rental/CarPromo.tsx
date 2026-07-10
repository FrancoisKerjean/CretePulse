// Encart partenaire location de voiture (PromoBox, pattern unique du site).
// CTA interne vers la landing /car-rental/[location] quand le pickup en désigne
// une sans ambiguïté (ou landing= explicite), sinon le wizard /car-rental avec
// ?pickup= contextuel. La landing embarque le même wizard pré-rempli et lit
// ?source= : le pré-remplissage et l'attribution sont préservés dans les 2 cas.
// En zone non couverte, passer pickup=undefined (le wizard ouvre à l'étape 1).
// Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md (§5)
import { Car } from "lucide-react";
import { PromoBox } from "@/components/PromoBox";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";
import { getCarLanding, landingForPickup } from "@/lib/car-landings";

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
  landing,
}: {
  locale: string;
  /** Slug de pickup contextuel (doit appartenir à une zone car-partners), sinon étape 1. */
  pickup?: string;
  /** Page d'origine, tracée par le wizard (prop source des events Plausible). */
  source?: string;
  /** Slug de landing /car-rental/[location] explicite quand le contexte la désigne (ex : page aéroport HER). */
  landing?: string;
}) {
  const c = COPY[locale] || COPY.en;
  const target = (landing ? getCarLanding(landing) : null) ?? (pickup ? landingForPickup(pickup) : null);
  const params = new URLSearchParams();
  // La landing pré-remplit déjà son propre pickup ; on ne le passe en query que
  // s'il diffère (le wizard fait primer ?pickup= sur la prop de la landing).
  if (pickup && (!target || target.pickup !== pickup)) params.set("pickup", pickup);
  if (source) params.set("source", source);
  const qs = params.toString();
  const base = target ? `/${locale}/car-rental/${target.slug}` : `/${locale}/car-rental`;
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
        ctaHref={`${base}${qs ? `?${qs}` : ""}`}
        disclosure={c.disclosure}
        photo="/images/partners/car-rental.jpg"
      />
    </>
  );
}
