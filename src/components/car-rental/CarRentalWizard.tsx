"use client";

// Wizard lead-gen location de voiture : 4 étapes à grosses cartes cliquables,
// zéro champ texte avant l'étape contact. Le lead part par email Resend chez
// le partenaire (API /api/car-rental/submit) ; zone sans partenaire → écran
// honnête, AUCUN envoi. La position "près de moi" ne quitte jamais le
// navigateur (useGeoPosition). Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CAR_ZONES, allPickups, zoneForPickup } from "@/lib/car-partners";
import { CAR_TYPES } from "@/lib/car-types";
import { CAR_CHILD_SEAT_KEYS, CAR_CHILD_SEAT_LABELS } from "@/lib/car-child-seats";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { nearestBy } from "@/lib/geo";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { CiCompass, CiMark, CiPlane } from "@/components/icons";
import { CarPriceEstimate } from "@/components/car-rental/CarPriceEstimate";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "chania-airport" → "Chania Airport". */
function pickupLabel(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Date locale YYYY-MM-DD (pas d'UTC : les défauts suivent le fuseau du visiteur). */
function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoLocal(d);
}

// ---- Titres de zone, 4 langues ---------------------------------------------

const ZONE_TITLES: Record<string, Record<string, string>> = {
  "chania-west": { en: "Chania & the west", fr: "La Canée et l'ouest", de: "Chania & der Westen", el: "Χανιά & δυτική Κρήτη" },
  "rethymno": { en: "Rethymno & around", fr: "Réthymnon et environs", de: "Rethymno & Umgebung", el: "Ρέθυμνο & γύρω περιοχή" },
  "heraklion-center": { en: "Heraklion & the centre", fr: "Héraklion et le centre", de: "Heraklion & Zentrum", el: "Ηράκλειο & κεντρική Κρήτη" },
  "lasithi-east": { en: "Lasithi & the east", fr: "Lassithi et l'est", de: "Lasithi & der Osten", el: "Λασίθι & ανατολική Κρήτη" },
};

// ---- i18n inline 4 langues, fallback EN (pattern NearMeClient) -------------

type Strings = {
  title1: string;
  nearMe: string;
  locating: string;
  denied: string;
  unavailable: string;
  title2: string;
  arrival: string;
  departure: string;
  dateLabel: string;
  timeLabel: string;
  flightOptional: string;
  invalidTimeRange: string;
  title3: string;
  paxLabel: string;
  insuranceLabel: string;
  insFull: string;
  insBasic: string;
  insAny: string;
  paymentLabel: string;
  payCash: string;
  payCard: string;
  payAny: string;
  gearboxLabel: string;
  gbAuto: string;
  gbManual: string;
  gbAny: string;
  childSeatsLabel: string;
  title4: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  noteLabel: string;
  rgpd: string;
  back: string;
  next: string;
  submit: string;
  sending: string;
  sentTitle: string;
  sentBody: string; // {partner}
  fallbackTitle: string;
  fallbackBody: string;
  whatsappCta: string;
  error: string;
  npTitle: string;
  npBody: string; // {place}
  npPartnersCta: string;
  npSuggest: string;
};

const T: Record<string, Strings> = {
  en: {
    title1: "Where do you pick up the car?",
    nearMe: "Near me",
    locating: "Locating…",
    denied: "Location request was declined. Pick a place from the list.",
    unavailable: "Location is not available on this device. Pick a place from the list.",
    title2: "When?",
    arrival: "Arrival / pick-up",
    departure: "Departure / drop-off",
    dateLabel: "Date",
    timeLabel: "Time",
    flightOptional: "Flight number (optional)",
    invalidTimeRange: "Drop-off time must be after pick-up time for a same-day rental.",
    title3: "Which car?",
    paxLabel: "Travellers",
    insuranceLabel: "Insurance (optional)",
    insFull: "Full (all-risk)",
    insBasic: "Basic",
    insAny: "No preference",
    paymentLabel: "Payment (optional)",
    payCash: "Cash",
    payCard: "Card",
    payAny: "No preference",
    gearboxLabel: "Gearbox (optional)",
    gbAuto: "Automatic",
    gbManual: "Manual",
    gbAny: "No preference",
    childSeatsLabel: "Child seats (optional)",
    title4: "Your contact details",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone / WhatsApp (optional)",
    noteLabel: "Anything else? (optional)",
    rgpd: "Your details are sent to the local partner agency so they can reply with a quote. Nothing else.",
    back: "Back",
    next: "Continue",
    submit: "Send request",
    sending: "Sending…",
    sentTitle: "Request sent",
    sentBody: "Request sent. Local rental agencies are preparing their price · you'll get the best offer by email shortly. No prepayment.",
    fallbackTitle: "The email didn't go through",
    fallbackBody: "Our email to the agency failed. Reach them directly on WhatsApp · your request is ready to send.",
    whatsappCta: "Open WhatsApp",
    error: "Something went wrong. Please try again in a moment.",
    npTitle: "No partner in this area yet",
    npBody: "We don't have a vetted rental partner around {place} yet. No request was sent: we only forward requests to agencies we actually work with.",
    npPartnersCta: "Run a local rental agency? Become a partner",
    npSuggest: "Closest area we cover:",
  },
  fr: {
    title1: "Où récupérez-vous la voiture ?",
    nearMe: "Près de moi",
    locating: "Localisation…",
    denied: "Localisation refusée. Choisissez un lieu dans la liste.",
    unavailable: "Localisation indisponible sur cet appareil. Choisissez un lieu dans la liste.",
    title2: "Quand ?",
    arrival: "Arrivée / prise du véhicule",
    departure: "Départ / restitution",
    dateLabel: "Date",
    timeLabel: "Heure",
    flightOptional: "Numéro de vol (facultatif)",
    invalidTimeRange: "Pour une location le même jour, l'heure de restitution doit être après l'heure de prise du véhicule.",
    title3: "Quelle voiture ?",
    paxLabel: "Voyageurs",
    insuranceLabel: "Assurance (facultatif)",
    insFull: "Tous risques",
    insBasic: "Basique",
    insAny: "Peu importe",
    paymentLabel: "Paiement (facultatif)",
    payCash: "Espèces",
    payCard: "Carte",
    payAny: "Peu importe",
    gearboxLabel: "Boîte de vitesses (facultatif)",
    gbAuto: "Automatique",
    gbManual: "Manuelle",
    gbAny: "Peu importe",
    childSeatsLabel: "Sièges enfants (facultatif)",
    title4: "Vos coordonnées",
    nameLabel: "Nom",
    emailLabel: "Email",
    phoneLabel: "Téléphone / WhatsApp (facultatif)",
    noteLabel: "Une précision ? (facultatif)",
    rgpd: "Vos coordonnées sont transmises à l'agence partenaire locale pour qu'elle vous réponde avec un devis. Rien d'autre.",
    back: "Retour",
    next: "Continuer",
    submit: "Envoyer la demande",
    sending: "Envoi…",
    sentTitle: "Demande envoyée",
    sentBody: "Demande envoyée. Les agences locales préparent leur prix : vous recevrez la meilleure offre par email très vite. Aucun prépaiement.",
    fallbackTitle: "L'email n'est pas parti",
    fallbackBody: "Notre email vers l'agence a échoué. Contactez-la directement sur WhatsApp : votre demande est prête à envoyer.",
    whatsappCta: "Ouvrir WhatsApp",
    error: "Une erreur est survenue. Réessayez dans un instant.",
    npTitle: "Pas encore de partenaire dans cette zone",
    npBody: "Nous n'avons pas encore d'agence de location partenaire vérifiée autour de {place}. Aucune demande n'a été envoyée : nous ne transmettons des demandes qu'aux agences avec lesquelles nous travaillons vraiment.",
    npPartnersCta: "Vous êtes une agence locale ? Devenez partenaire",
    npSuggest: "Zone couverte la plus proche :",
  },
  de: {
    title1: "Wo holen Sie das Auto ab?",
    nearMe: "In meiner Nähe",
    locating: "Standort wird ermittelt…",
    denied: "Standortfreigabe abgelehnt. Wählen Sie einen Ort aus der Liste.",
    unavailable: "Standort auf diesem Gerät nicht verfügbar. Wählen Sie einen Ort aus der Liste.",
    title2: "Wann?",
    arrival: "Ankunft / Abholung",
    departure: "Abreise / Rückgabe",
    dateLabel: "Datum",
    timeLabel: "Uhrzeit",
    flightOptional: "Flugnummer (optional)",
    invalidTimeRange: "Bei einer Mietdauer am selben Tag muss die Rückgabezeit nach der Abholzeit liegen.",
    title3: "Welches Auto?",
    paxLabel: "Reisende",
    insuranceLabel: "Versicherung (optional)",
    insFull: "Vollkasko",
    insBasic: "Basis",
    insAny: "Egal",
    paymentLabel: "Zahlung (optional)",
    payCash: "Bar",
    payCard: "Karte",
    payAny: "Egal",
    gearboxLabel: "Getriebe (optional)",
    gbAuto: "Automatik",
    gbManual: "Schaltgetriebe",
    gbAny: "Egal",
    childSeatsLabel: "Kindersitze (optional)",
    title4: "Ihre Kontaktdaten",
    nameLabel: "Name",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon / WhatsApp (optional)",
    noteLabel: "Noch etwas? (optional)",
    rgpd: "Ihre Daten werden an die lokale Partneragentur übermittelt, damit sie Ihnen ein Angebot senden kann. Sonst nichts.",
    back: "Zurück",
    next: "Weiter",
    submit: "Anfrage senden",
    sending: "Wird gesendet…",
    sentTitle: "Anfrage gesendet",
    sentBody: "Anfrage gesendet. Lokale Autovermietungen bereiten ihren Preis vor · Sie erhalten das beste Angebot in Kürze per E-Mail. Keine Vorauszahlung.",
    fallbackTitle: "E-Mail nicht zugestellt",
    fallbackBody: "Unsere E-Mail an die Agentur ist fehlgeschlagen. Kontaktieren Sie sie direkt per WhatsApp · Ihre Anfrage ist vorbereitet.",
    whatsappCta: "WhatsApp öffnen",
    error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es gleich noch einmal.",
    npTitle: "Noch kein Partner in dieser Gegend",
    npBody: "Rund um {place} haben wir noch keine geprüfte Partneragentur. Es wurde keine Anfrage gesendet: Wir leiten Anfragen nur an Agenturen weiter, mit denen wir wirklich zusammenarbeiten.",
    npPartnersCta: "Sie führen eine lokale Agentur? Partner werden",
    npSuggest: "Nächstgelegene abgedeckte Gegend:",
  },
  el: {
    title1: "Πού θα παραλάβετε το αυτοκίνητο;",
    nearMe: "Κοντά μου",
    locating: "Εντοπισμός…",
    denied: "Ο εντοπισμός απορρίφθηκε. Επιλέξτε ένα μέρος από τη λίστα.",
    unavailable: "Ο εντοπισμός δεν είναι διαθέσιμος σε αυτήν τη συσκευή. Επιλέξτε ένα μέρος από τη λίστα.",
    title2: "Πότε;",
    arrival: "Άφιξη / παραλαβή",
    departure: "Αναχώρηση / επιστροφή",
    dateLabel: "Ημερομηνία",
    timeLabel: "Ώρα",
    flightOptional: "Αριθμός πτήσης (προαιρετικό)",
    invalidTimeRange: "Για ενοικίαση την ίδια ημέρα, η ώρα επιστροφής πρέπει να είναι μετά την ώρα παραλαβής.",
    title3: "Ποιο αυτοκίνητο;",
    paxLabel: "Ταξιδιώτες",
    insuranceLabel: "Ασφάλεια (προαιρετικό)",
    insFull: "Πλήρης",
    insBasic: "Βασική",
    insAny: "Αδιάφορο",
    paymentLabel: "Πληρωμή (προαιρετικό)",
    payCash: "Μετρητά",
    payCard: "Κάρτα",
    payAny: "Αδιάφορο",
    gearboxLabel: "Κιβώτιο ταχυτήτων (προαιρετικό)",
    gbAuto: "Αυτόματο",
    gbManual: "Χειροκίνητο",
    gbAny: "Αδιάφορο",
    childSeatsLabel: "Παιδικά καθίσματα (προαιρετικό)",
    title4: "Τα στοιχεία σας",
    nameLabel: "Όνομα",
    emailLabel: "Email",
    phoneLabel: "Τηλέφωνο / WhatsApp (προαιρετικό)",
    noteLabel: "Κάτι άλλο; (προαιρετικό)",
    rgpd: "Τα στοιχεία σας αποστέλλονται στο τοπικό συνεργαζόμενο γραφείο ώστε να σας απαντήσει με προσφορά. Τίποτα άλλο.",
    back: "Πίσω",
    next: "Συνέχεια",
    submit: "Αποστολή αιτήματος",
    sending: "Αποστολή…",
    sentTitle: "Το αίτημα στάλθηκε",
    sentBody: "Το αίτημα στάλθηκε. Τα τοπικά γραφεία ετοιμάζουν την τιμή τους · θα λάβετε σύντομα την καλύτερη προσφορά με email. Καμία προπληρωμή.",
    fallbackTitle: "Το email δεν στάλθηκε",
    fallbackBody: "Το email προς το γραφείο απέτυχε. Επικοινωνήστε απευθείας μέσω WhatsApp · το αίτημά σας είναι έτοιμο για αποστολή.",
    whatsappCta: "Άνοιγμα WhatsApp",
    error: "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.",
    npTitle: "Δεν υπάρχει ακόμη συνεργάτης σε αυτήν την περιοχή",
    npBody: "Δεν έχουμε ακόμη ελεγμένο συνεργαζόμενο γραφείο ενοικίασης γύρω από το {place}. Δεν στάλθηκε κανένα αίτημα: προωθούμε αιτήματα μόνο σε γραφεία με τα οποία πραγματικά συνεργαζόμαστε.",
    npPartnersCta: "Είστε τοπικό γραφείο; Γίνετε συνεργάτης",
    npSuggest: "Πλησιέστερη καλυπτόμενη περιοχή:",
  },
};

type View = "steps" | "noPartner" | "sent" | "fallback";

const INPUT_CLS =
  "w-full rounded-xl border-[1.5px] border-border bg-white px-3.5 py-2.5 text-[15px] text-text focus:outline-none focus:border-sea transition-colors";
const LABEL_CLS = "block text-[12px] font-semibold text-text-muted mb-1";

type CarRentalWizardProps = {
  locale: string;
  servedZones: string[];
  initialPickup?: string;
  /** Source d'attribution par défaut de la page hôte (ex : landing-chania-airport), supplantée par ?source=. */
  initialSource?: string;
};

export function CarRentalWizard({ locale, servedZones, initialPickup: initialPickupProp, initialSource }: CarRentalWizardProps) {
  const t = T[locale] || T.en;
  const sp = useSearchParams();

  // ?pickup= ou prop initialPickup valide (slug connu d'une zone) → étape 2 directement.
  const initialPickup = useMemo(() => {
    const q = sp.get("pickup");
    if (q && zoneForPickup(q) && SLUG_COORDS[q]) return q;
    return initialPickupProp && zoneForPickup(initialPickupProp) && SLUG_COORDS[initialPickupProp] ? initialPickupProp : null;
  }, [sp, initialPickupProp]);

  const [view, setView] = useState<View>("steps");
  const [step, setStep] = useState(initialPickup ? 2 : 1);
  const [pickup, setPickup] = useState<string | null>(initialPickup);
  const [dateFrom, setDateFrom] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [carType, setCarType] = useState<string | null>(null);
  const [pax, setPax] = useState(2);
  const [insurance, setInsurance] = useState(""); // "" = peu importe, "full", "basic"
  const [payment, setPayment] = useState("");     // "" = peu importe, "cash", "card"
  const [gearbox, setGearbox] = useState("");     // "" = peu importe, "automatic", "manual"
  const [childSeats, setChildSeats] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [fallbackWhatsapp, setFallbackWhatsapp] = useState<string | null>(null);
  const [nearRequested, setNearRequested] = useState(false);

  // Défauts dates au mount (et pas au render : la page est prérendue au build).
  useEffect(() => {
    setDateFrom((d) => d || isoPlusDays(1));
    setDateTo((d) => d || isoPlusDays(8));
  }, []);

  const today = useMemo(() => isoLocal(new Date()), []);
  const { status: geoStatus, pos, requestGeo } = useGeoPosition();

  // Changement d'étape ou d'écran : ramener le haut du wizard sous le header
  // sticky (sinon le titre de la confirmation reste caché derrière). Pas au
  // premier rendu : la page charge en haut, ?pickup= ne doit pas faire sauter.
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [step, view]);

  const advance = (to: number) => {
    setStep(to);
    window.plausible?.("Car Wizard Step", { props: { step: String(to) } });
  };

  // "Près de moi" : dès que la position arrive, pickup le plus proche → étape 2.
  useEffect(() => {
    if (!nearRequested || !pos) return;
    const nearest = nearestBy(allPickups().filter((p) => servedZones.includes(p.zoneId)), (p) => SLUG_COORDS[p.slug] ?? null, pos, 1)[0];
    setNearRequested(false);
    if (nearest) {
      setPickup(nearest.slug);
      advance(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearRequested, pos]);

  const served = pickup ? servedZones.includes(zoneForPickup(pickup)?.id ?? "") : false;
  const carTypeDef = CAR_TYPES.find((c) => c.id === carType) ?? null;

  // Pickup servi le plus proche du pickup non servi choisi (suggestion honnête).
  const suggestion = useMemo(() => {
    if (!pickup) return null;
    const c = SLUG_COORDS[pickup];
    if (!c) return null;
    return nearestBy(
      allPickups().filter((p) => servedZones.includes(p.zoneId)),
      (p) => SLUG_COORDS[p.slug] ?? null,
      { lat: c[0], lon: c[1] },
      1,
    )[0] ?? null;
  }, [pickup]);

  const datesValid =
    /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) &&
    dateFrom >= today && dateTo >= dateFrom;
  const timeFilled = /^\d{2}:\d{2}$/.test(timeFrom) && /^\d{2}:\d{2}$/.test(timeTo);
  const timesValid = timeFilled && (dateTo !== dateFrom || timeTo > timeFrom);
  const contactValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());

  const source = sp.get("source") ?? initialSource ?? (initialPickup ? "promo" : "direct");

  async function submit() {
    if (!pickup || !carTypeDef || !contactValid || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/car-rental/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup, carType: carTypeDef.id,
          name: name.trim(), email: email.trim(), phone: phone.trim() || undefined,
          dateFrom, timeFrom, dateTo, timeTo,
          flightNo: flightNo.trim() || undefined, pax, note: note.trim() || undefined,
          insurance: insurance || undefined, payment: payment || undefined,
          gearbox: gearbox || undefined, childSeats,
          locale, source, website,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok === true) {
        window.plausible?.("Car Lead", {
          props: {
            zone: zoneForPickup(pickup)?.id ?? "unknown",
            pickup,
            carType: carTypeDef.id,
            source,
          },
        });
        setView("sent");
      } else if (res.ok && json?.ok === false && json.fallbackWhatsapp) {
        setFallbackWhatsapp(String(json.fallbackWhatsapp));
        setView("fallback");
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const recap = pickup && (
    <div className="mt-5 rounded-2xl bg-surface px-4 py-3.5 text-left">
      <p className="m-0 font-heading font-bold text-[15px] text-text">{pickupLabel(pickup)}</p>
      <p className="m-0 mt-1 text-sm text-text-muted font-data">
        {dateFrom}{timeFrom ? ` ${timeFrom}` : ""} → {dateTo}{timeTo ? ` ${timeTo}` : ""}
      </p>
      {carTypeDef && (
        <p className="m-0 mt-1 text-sm text-text-muted">
          {carTypeDef.labels[locale] ?? carTypeDef.labels.en}
          {" · "}
          <span className="font-data">{pax} pax</span>
        </p>
      )}
    </div>
  );

  // ---- Écrans finaux --------------------------------------------------------

  if (view === "sent") {
    return (
      <div ref={rootRef} data-testid="car-wizard-sent" className="card-base p-7 sm:p-10 text-center scroll-mt-24">
        <CiMark className="w-12 h-12 text-lagoon-deep mx-auto" />
        <h2 className="mt-4 font-heading font-extrabold text-2xl text-text">{t.sentTitle}</h2>
        <p className="mt-2 text-[15px] text-text-muted max-w-xl mx-auto">
          {t.sentBody}
        </p>
        <div className="max-w-sm mx-auto">{recap}</div>
      </div>
    );
  }

  if (view === "fallback") {
    const waNumber = (fallbackWhatsapp ?? "").replace(/[^\d]/g, "");
    const waText = encodeURIComponent(
      `Hi! Car rental request via crete.direct · ${pickup ? pickupLabel(pickup) : ""}, ` +
      `${dateFrom}${timeFrom ? ` ${timeFrom}` : ""} to ${dateTo}${timeTo ? ` ${timeTo}` : ""}, ` +
      `${carTypeDef ? carTypeDef.labels.en : ""}, ${pax} pax. ${name.trim()}`,
    );
    return (
      <div ref={rootRef} data-testid="car-wizard-fallback" className="card-base p-7 sm:p-10 text-center scroll-mt-24">
        <h2 className="font-heading font-extrabold text-2xl text-text">{t.fallbackTitle}</h2>
        <p className="mt-2 text-[15px] text-text-muted max-w-xl mx-auto">{t.fallbackBody}</p>
        <a
          href={`https://wa.me/${waNumber}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold no-underline hover:brightness-105 transition-all"
        >
          {t.whatsappCta}
        </a>
        <div className="max-w-sm mx-auto">{recap}</div>
      </div>
    );
  }

  if (view === "noPartner") {
    return (
      <div ref={rootRef} data-testid="car-wizard-no-partner" className="card-base p-7 sm:p-10 text-center scroll-mt-24">
        <CiCompass className="w-12 h-12 text-sea mx-auto" />
        <h2 className="mt-4 font-heading font-extrabold text-2xl text-text">{t.npTitle}</h2>
        <p className="mt-2 text-[15px] text-text-muted max-w-xl mx-auto">
          {t.npBody.replace("{place}", pickup ? pickupLabel(pickup) : "")}
        </p>
        {suggestion && (
          <div className="mt-5">
            <p className="text-[12px] uppercase tracking-wide text-text-muted m-0 mb-2">{t.npSuggest}</p>
            <button
              type="button"
              onClick={() => {
                setPickup(suggestion.slug);
                setView("steps");
                advance(4);
              }}
              className="inline-flex items-center gap-2 bg-sun text-text rounded-full px-5 py-2.5 text-[14px] font-heading font-bold hover:brightness-105 transition-all"
            >
              <CiMark className="w-4.5 h-4.5" /> {pickupLabel(suggestion.slug)}
              <span className="font-data text-[12px] opacity-70">{Math.round(suggestion.km)} km</span>
            </button>
          </div>
        )}
        <p className="mt-6 m-0">
          <Link href={`/${locale}/partners`} className="text-sm font-bold text-lagoon-deep hover:underline">
            {t.npPartnersCta}
          </Link>
        </p>
      </div>
    );
  }

  // ---- Étapes ---------------------------------------------------------------

  return (
    <div ref={rootRef} className="card-base p-5 sm:p-7 scroll-mt-24">
      {/* Barre de progression : 4 segments */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-sun" : "bg-border"}`} />
          ))}
        </div>
        <span className="font-data text-xs font-semibold text-text-muted">{step}/4</span>
      </div>

      {/* Étape 1 : où ? */}
      {step === 1 && (
        <div data-testid="car-step-1">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="font-heading font-extrabold text-xl text-text m-0">{t.title1}</h2>
            <button
              type="button"
              onClick={() => {
                setNearRequested(true);
                if (!pos) requestGeo();
              }}
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-sea/40 bg-white px-4 py-2 text-[13px] font-heading font-bold text-sea hover:bg-sea-faint transition-colors"
            >
              <CiCompass className="w-4.5 h-4.5" />
              {geoStatus === "prompting" ? t.locating : t.nearMe}
            </button>
          </div>
          {(geoStatus === "denied" || geoStatus === "unavailable") && (
            <p className="text-sm text-terracotta -mt-2 mb-4">
              {geoStatus === "denied" ? t.denied : t.unavailable}
            </p>
          )}
          <div className="space-y-6">
            {CAR_ZONES.map((zone) => (
              <div key={zone.id}>
                <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-text-muted m-0 mb-2.5">
                  {ZONE_TITLES[zone.id]?.[locale] ?? ZONE_TITLES[zone.id]?.en ?? zone.id}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {zone.pickups.map((slug) => {
                    const Icon = slug.endsWith("-airport") ? CiPlane : CiMark;
                    return (
                      <button
                        key={slug}
                        type="button"
                        data-testid={`pickup-${slug}`}
                        onClick={() => {
                          setPickup(slug);
                          advance(2);
                        }}
                        className={`flex items-center gap-2.5 rounded-2xl border-[1.5px] bg-white p-3.5 text-left transition-colors ${
                          pickup === slug ? "border-sea bg-sea-faint" : "border-border hover:border-sea/50"
                        }`}
                      >
                        <Icon className="w-5 h-5 text-sea shrink-0" />
                        <span className="font-heading font-bold text-[14px] leading-tight text-text">
                          {pickupLabel(slug)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étape 2 : quand ? */}
      {step === 2 && (
        <div data-testid="car-step-2">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title2}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <fieldset className="m-0 p-0 border-0">
              <legend className="font-heading font-bold text-[15px] text-text mb-2.5 p-0">{t.arrival}</legend>
              <div className="space-y-3">
                <div>
                  <label htmlFor="cr-date-from" className={LABEL_CLS}>{t.dateLabel}</label>
                  <input
                    id="cr-date-from"
                    type="date"
                    min={today}
                    value={dateFrom}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDateFrom(v);
                      if (dateTo && v && dateTo < v) setDateTo(v);
                    }}
                    className={`${INPUT_CLS} font-data`}
                  />
                </div>
                <div>
                  <label htmlFor="cr-time-from" className={LABEL_CLS}>{t.timeLabel}</label>
                  <input
                    id="cr-time-from"
                    type="time"
                    required
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    className={`${INPUT_CLS} font-data`}
                  />
                </div>
                <div>
                  <label htmlFor="cr-flight" className={LABEL_CLS}>{t.flightOptional}</label>
                  <input
                    id="cr-flight"
                    type="text"
                    placeholder="A3 350"
                    value={flightNo}
                    onChange={(e) => setFlightNo(e.target.value)}
                    className={`${INPUT_CLS} font-data`}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset className="m-0 p-0 border-0">
              <legend className="font-heading font-bold text-[15px] text-text mb-2.5 p-0">{t.departure}</legend>
              <div className="space-y-3">
                <div>
                  <label htmlFor="cr-date-to" className={LABEL_CLS}>{t.dateLabel}</label>
                  <input
                    id="cr-date-to"
                    type="date"
                    min={dateFrom || today}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`${INPUT_CLS} font-data`}
                  />
                </div>
                <div>
                  <label htmlFor="cr-time-to" className={LABEL_CLS}>{t.timeLabel}</label>
                  <input
                    id="cr-time-to"
                    type="time"
                    required
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className={`${INPUT_CLS} font-data`}
                  />
                </div>
              </div>
            </fieldset>
          </div>
          {!timesValid && (
            <p className="mt-4 text-sm font-semibold text-terracotta">{t.invalidTimeRange}</p>
          )}
        </div>
      )}

      {/* Étape 3 : quoi ? */}
      {step === 3 && (
        <div data-testid="car-step-3">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title3}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CAR_TYPES.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`car-type-${c.id}`}
                onClick={() => setCarType(c.id)}
                className={`flex flex-col items-stretch gap-1 overflow-hidden rounded-2xl border-[1.5px] bg-white p-2.5 transition-colors ${
                  carType === c.id ? "border-sea bg-sea-faint" : "border-border hover:border-sea/50"
                }`}
              >
                <img
                  src={c.photo}
                  alt=""
                  loading="lazy"
                  className="h-20 w-full rounded-xl bg-sea-faint object-cover"
                />
                <span className="mt-1 text-center font-heading font-bold text-[14px] leading-tight text-text">
                  {c.labels[locale] ?? c.labels.en}
                </span>
                {c.examples.length > 0 && (
                  <span className="text-center text-[10px] leading-tight text-text-muted">
                    {c.examples.join(" · ")}
                  </span>
                )}
                <span className="text-center font-data text-xs text-text-muted">{c.pax} pax</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] leading-tight text-text-muted/70">
            Photos : Wikimedia Commons · CC BY-SA 4.0
          </p>
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3.5">
            <span className="font-heading font-bold text-[15px] text-text">{t.paxLabel}</span>
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                aria-label="−"
                onClick={() => setPax((p) => Math.max(1, p - 1))}
                disabled={pax <= 1}
                className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
              >
                −
              </button>
              <span data-testid="car-pax" className="font-data text-xl font-bold text-text w-7 text-center">{pax}</span>
              <button
                type="button"
                aria-label="+"
                onClick={() => setPax((p) => Math.min(8, p + 1))}
                disabled={pax >= 8}
                className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          {/* Assurance + paiement (optionnels, défaut « peu importe ») */}
          <div className="mt-5 space-y-3.5">
            <div>
              <span className="block mb-1.5 font-heading font-bold text-[14px] text-text">{t.insuranceLabel}</span>
              <div className="flex flex-wrap gap-2">
                {([["full", t.insFull], ["basic", t.insBasic], ["", t.insAny]] as const).map(([val, label]) => (
                  <button key={val || "any"} type="button" onClick={() => setInsurance(val)}
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${insurance === val ? "border-sea bg-sea-faint text-text" : "border-border bg-white text-text-muted hover:border-sea/50"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block mb-1.5 font-heading font-bold text-[14px] text-text">{t.paymentLabel}</span>
              <div className="flex flex-wrap gap-2">
                {([["cash", t.payCash], ["card", t.payCard], ["", t.payAny]] as const).map(([val, label]) => (
                  <button key={val || "any"} type="button" onClick={() => setPayment(val)}
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${payment === val ? "border-sea bg-sea-faint text-text" : "border-border bg-white text-text-muted hover:border-sea/50"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block mb-1.5 font-heading font-bold text-[14px] text-text">{t.gearboxLabel}</span>
              <div className="flex flex-wrap gap-2">
                {([["automatic", t.gbAuto], ["manual", t.gbManual], ["", t.gbAny]] as const).map(([val, label]) => (
                  <button key={val || "any"} type="button" onClick={() => setGearbox(val)}
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${gearbox === val ? "border-sea bg-sea-faint text-text" : "border-border bg-white text-text-muted hover:border-sea/50"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block mb-1.5 font-heading font-bold text-[14px] text-text">{t.childSeatsLabel}</span>
              <div className="flex flex-wrap gap-2">
                {CAR_CHILD_SEAT_KEYS.map((k) => {
                  const on = childSeats.includes(k);
                  const label = (CAR_CHILD_SEAT_LABELS[locale] ?? CAR_CHILD_SEAT_LABELS.en)[k];
                  return (
                    <button key={k} type="button"
                      onClick={() => setChildSeats((cur) => on ? cur.filter((x) => x !== k) : [...cur, k])}
                      className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${on ? "border-sea bg-sea-faint text-text" : "border-border bg-white text-text-muted hover:border-sea/50"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {carType && (
            <CarPriceEstimate
              carType={carType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locale={locale}
              placement="wizard-step3"
            />
          )}
        </div>
      )}

      {/* Étape 4 : qui ? */}
      {step === 4 && (
        <div data-testid="car-step-4">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title4}</h2>
          {carType && (
            <CarPriceEstimate
              carType={carType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              locale={locale}
              placement="wizard-step4"
            />
          )}
          <div className="space-y-3 max-w-md">
            <div>
              <label htmlFor="cr-name" className={LABEL_CLS}>{t.nameLabel}</label>
              <input id="cr-name" type="text" autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label htmlFor="cr-email" className={LABEL_CLS}>{t.emailLabel}</label>
              <input id="cr-email" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label htmlFor="cr-phone" className={LABEL_CLS}>{t.phoneLabel}</label>
              <input id="cr-phone" type="tel" autoComplete="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)} className={`${INPUT_CLS} font-data`} />
            </div>
            <div>
              <label htmlFor="cr-note" className={LABEL_CLS}>{t.noteLabel}</label>
              <textarea id="cr-note" rows={3} value={note} maxLength={500}
                onChange={(e) => setNote(e.target.value)} className={INPUT_CLS} />
            </div>
            {/* Honeypot : invisible pour les humains, irrésistible pour les bots */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <p className="text-xs text-text-muted leading-relaxed m-0 pt-1">{t.rgpd}</p>
            {submitError && <p className="text-sm font-semibold text-terracotta m-0">{t.error}</p>}
          </div>
        </div>
      )}

      {/* Navigation back / next */}
      {step > 1 && (
        <div className="mt-7 flex items-center justify-between gap-4">
          <button
            type="button"
            data-testid="car-back"
            onClick={() => setStep(step - 1)}
            className="text-sm font-bold text-text-muted hover:text-text transition-colors"
          >
            ← {t.back}
          </button>
          {step < 4 ? (
            <button
              type="button"
              data-testid="car-next"
              onClick={() => {
                if (step === 3 && !served) { setView("noPartner"); return; }
                advance(step + 1);
              }}
              disabled={step === 2 ? !datesValid || !timesValid : step === 3 ? !carType : false}
              className="bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition-all"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="button"
              data-testid="car-submit"
              onClick={submit}
              disabled={!contactValid || submitting}
              className="bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition-all"
            >
              {submitting ? t.sending : t.submit}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
