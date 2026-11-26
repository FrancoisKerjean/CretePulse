import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { AcceptButton, type AcceptRefusals } from "./AcceptButton";
import { isCallablePhone } from "@/lib/car-lead";
import { DeclineButton } from "./DeclineButton";
import { OfferBeacon } from "./OfferBeacon";
import { offerViewProps } from "@/lib/car-offer-metrics";
import { CAR_INSURANCE_HEADING, inclusionLabels, insuranceSummary } from "@/lib/car-inclusions";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { sharedOfferCopy } from "@/lib/car-offer-copy";
import { requestByClientToken } from "@/lib/car-quotes-db";
import { rentalDays } from "@/lib/car-pricing";
import { curateOffers, quotedModelLabel } from "@/lib/car-quotes";
import type { QuoteOption } from "@/lib/car-quotes";
import { depositEur } from "@/lib/car-catalogue";
import { isDepositBookable } from "@/lib/car-deposit";
import { depositRatesFor } from "@/lib/car-deposit-server";
import { fill, formatEur } from "../../car-booking/content";

const GEARBOX_LABEL: Record<string, string> = { automatic: "Automatic", manual: "Manual" };

// Libellé QUALIFIÉ de la boîte, pour les devis sans modèle de voiture. Affiché à
// la place du modèle, « Manual » tout seul se lit comme un nom de voiture : c'est
// ce qu'ont vu les clients des demandes 25 et 33. Ici le mot dit ce qu'il est.
const GEARBOX_ONLY: Record<string, Record<string, string>> = {
  en: { automatic: "Automatic gearbox", manual: "Manual gearbox" },
  fr: { automatic: "Boîte automatique", manual: "Boîte manuelle" },
  de: { automatic: "Automatikgetriebe", manual: "Schaltgetriebe" },
  el: { automatic: "Αυτόματο κιβώτιο", manual: "Χειροκίνητο κιβώτιο" },
};
const MORE_OFFERS: Record<string, string> = {
  en: "See the {n} other offers",
  fr: "Voir les {n} autres offres",
  de: "Die {n} weiteren Angebote ansehen",
  el: "Δείτε τις {n} άλλες προσφορές",
};

// Acompte (interrupteur CAR_CATALOGUE_ENABLED) : textes qui remplacent ceux de
// la mise en relation. Interrupteur éteint, rien de ceci n'est lu et la page
// reste celle d'aujourd'hui.
type DepositCopy = {
  intro: string; phoneHint: string; dueLine: string; confirmLine: string; cancelLine: string;
  book: string; bookPlain: string; declined: string; alreadyTitle: string; alreadyBody: string;
  refusals: AcceptRefusals;
};

const DEPOSIT_COPY: Record<string, DepositCopy> = {
  en: {
    intro: "Choose your offer and pay a deposit online. You pay the rest to the agency at pick-up.",
    phoneHint: "The agency receives your number only once it confirms your booking.",
    dueLine: "{deposit} today · {rest} at the counter",
    confirmLine: "Confirmed within 4 hours, otherwise refunded",
    cancelLine: "Free cancellation up to 48 hours before pick-up",
    book: "Book with {deposit}",
    bookPlain: "Book this offer",
    declined: "No longer available from this agency.",
    alreadyTitle: "Booking under way",
    alreadyBody: "You paid a deposit on one of these offers. Follow its status in the emails we send you.",
    refusals: {
      inProgress: "A payment is already open for this request. If you left the payment page, it closes within 30 minutes and you can choose again.",
      tooClose: "Too close to departure to book online.",
      belowMinimum: "This offer cannot be booked online.",
      unavailable: "No longer available from this agency.",
      notReady: "This offer cannot be booked right now. Try again in a few minutes.",
    },
  },
  fr: {
    intro: "Choisissez votre offre et payez un acompte en ligne. Vous réglez le reste à l'agence à la prise du véhicule.",
    phoneHint: "L'agence reçoit votre numéro seulement quand elle confirme votre réservation.",
    dueLine: "{deposit} aujourd'hui · {rest} au comptoir",
    confirmLine: "Confirmée sous 4 h, sinon remboursée",
    cancelLine: "Annulation gratuite jusqu'à 48 h avant la prise du véhicule",
    book: "Réserver avec {deposit}",
    bookPlain: "Réserver cette offre",
    declined: "Plus disponible chez cette agence.",
    alreadyTitle: "Réservation en cours",
    alreadyBody: "Vous avez payé un acompte sur l'une de ces offres. Suivez son état dans les e-mails que nous vous envoyons.",
    refusals: {
      inProgress: "Un paiement est déjà ouvert pour cette demande. Si vous avez quitté la page de paiement, elle se ferme d'ici 30 minutes et vous pourrez choisir à nouveau.",
      tooClose: "Trop proche du départ pour réserver en ligne.",
      belowMinimum: "Cette offre ne peut pas être réservée en ligne.",
      unavailable: "Plus disponible chez cette agence.",
      notReady: "Cette offre ne peut pas être réservée pour le moment. Réessayez dans quelques minutes.",
    },
  },
  de: {
    intro: "Wählen Sie Ihr Angebot und zahlen Sie online eine Anzahlung. Den Rest zahlen Sie bei der Abholung an die Vermietung.",
    phoneHint: "Die Vermietung erhält Ihre Nummer erst, wenn sie Ihre Buchung bestätigt.",
    dueLine: "{deposit} heute · {rest} am Schalter",
    confirmLine: "Bestätigung innerhalb von 4 Stunden, sonst Erstattung",
    cancelLine: "Kostenlose Stornierung bis 48 Stunden vor Abholung",
    book: "Mit {deposit} buchen",
    bookPlain: "Dieses Angebot buchen",
    declined: "Bei dieser Vermietung nicht mehr verfügbar.",
    alreadyTitle: "Buchung läuft",
    alreadyBody: "Sie haben für eines dieser Angebote eine Anzahlung geleistet. Den Stand erfahren Sie aus unseren E-Mails.",
    refusals: {
      inProgress: "Für diese Anfrage ist bereits eine Zahlung offen. Wenn Sie die Zahlungsseite verlassen haben, schließt sie sich innerhalb von 30 Minuten und Sie können neu wählen.",
      tooClose: "Zu kurz vor der Abholung für eine Online-Buchung.",
      belowMinimum: "Dieses Angebot kann nicht online gebucht werden.",
      unavailable: "Bei dieser Vermietung nicht mehr verfügbar.",
      notReady: "Dieses Angebot kann gerade nicht gebucht werden. Versuchen Sie es in einigen Minuten erneut.",
    },
  },
  el: {
    intro: "Επιλέξτε την προσφορά σας και πληρώστε online μια προκαταβολή. Το υπόλοιπο το πληρώνετε στο γραφείο κατά την παραλαβή.",
    phoneHint: "Το γραφείο λαμβάνει τον αριθμό σας μόνο όταν επιβεβαιώσει την κράτησή σας.",
    dueLine: "{deposit} σήμερα · {rest} στο γκισέ",
    confirmLine: "Επιβεβαίωση εντός 4 ωρών, αλλιώς επιστροφή χρημάτων",
    cancelLine: "Δωρεάν ακύρωση έως 48 ώρες πριν την παραλαβή",
    book: "Κράτηση με {deposit}",
    bookPlain: "Κράτηση αυτής της προσφοράς",
    declined: "Δεν είναι πλέον διαθέσιμο από αυτό το γραφείο.",
    alreadyTitle: "Κράτηση σε εξέλιξη",
    alreadyBody: "Πληρώσατε προκαταβολή για μία από αυτές τις προσφορές. Δείτε την πορεία της στα email που σας στέλνουμε.",
    refusals: {
      inProgress: "Υπάρχει ήδη ανοιχτή πληρωμή για αυτό το αίτημα. Αν φύγατε από τη σελίδα πληρωμής, κλείνει μέσα σε 30 λεπτά και μπορείτε να επιλέξετε ξανά.",
      tooClose: "Πολύ κοντά στην αναχώρηση για online κράτηση.",
      belowMinimum: "Αυτή η προσφορά δεν μπορεί να κρατηθεί online.",
      unavailable: "Δεν είναι πλέον διαθέσιμο από αυτό το γραφείο.",
      notReady: "Αυτή η προσφορά δεν μπορεί να κρατηθεί αυτή τη στιγμή. Δοκιμάστε ξανά σε λίγα λεπτά.",
    },
  },
};

/** Ce que la carte d'une offre affiche en mode acompte. */
type DepositView = {
  /** undefined : taux du loueur illisible (montant non affiché, le serveur tranche au choix). null : sous le minimum Stripe. */
  amount: number | null | undefined;
  bookable: boolean;
  declined: boolean;
  dc: DepositCopy;
};

const refusalBox = { margin: 0, padding: "16px 18px", borderRadius: 12, background: "#FEF9EC", color: "#92400E", fontSize: 15, lineHeight: 1.6 } as const;

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

const money = (p: number, c: string) => (c === "EUR" ? `€${p}` : `${p} ${c}`);

type Copy = {
  title: string; intro: string; request: string; accept: string; done: string;
  expired: string; expiredOffer: string; alreadyTitle: string; alreadyBody: string;
  noOffers: string; offersTitle: string; declineLink: string; declineDone: string;
  phoneLabel: string; phoneHint: string; phoneError: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Your car rental quotes", intro: "Choose the offer that suits you. Accept one and we connect you directly with the rental agency.", request: "Your request", accept: "Accept this offer", done: "Accepted! The rental agency now has your details and will contact you. Check your inbox for their contact info.", expired: "This offer link is no longer valid.", expiredOffer: "This offer has expired. Send a new request and local agencies will quote you again.", alreadyTitle: "Already accepted", alreadyBody: "You already accepted an offer. The rental agency will contact you, and their details are in your inbox.", noOffers: "Your offers are on the way — check back shortly.", offersTitle: "Your car rental offers", declineLink: "None of these offers suits me", declineDone: "Noted, no problem. This request is now closed.",
    phoneLabel: "Your phone / WhatsApp", phoneHint: "The agency calls or texts you to confirm the car. This is the only step left.", phoneError: "Please enter a number the agency can reach you on.",
  },
  fr: {
    title: "Vos devis de location", intro: "Choisissez l'offre qui vous convient. Acceptez-en une et nous vous mettons directement en relation avec l'agence.", request: "Votre demande", accept: "Accepter cette offre", done: "Accepté ! L'agence de location a maintenant vos coordonnées et va vous contacter. Ses coordonnées sont dans votre boîte mail.", expired: "Ce lien d'offre n'est plus valide.", expiredOffer: "Cette offre a expiré. Refaites une demande et les agences locales vous proposeront un nouveau prix.", alreadyTitle: "Déjà accepté", alreadyBody: "Vous avez déjà accepté une offre. L'agence va vous contacter, ses coordonnées sont dans votre boîte mail.", noOffers: "Vos offres arrivent, revenez bientôt.", offersTitle: "Vos offres de location", declineLink: "Aucune de ces offres ne me convient", declineDone: "Noté, pas de souci. Votre demande est clôturée.",
    phoneLabel: "Votre téléphone / WhatsApp", phoneHint: "L'agence vous appelle ou vous écrit pour confirmer la voiture. C'est la dernière étape.", phoneError: "Indiquez un numéro sur lequel l'agence peut vous joindre.",
  },
  de: {
    title: "Ihre Mietwagen-Angebote", intro: "Wählen Sie das passende Angebot. Nehmen Sie eines an und wir verbinden Sie direkt mit der Autovermietung.", request: "Ihre Anfrage", accept: "Angebot annehmen", done: "Angenommen! Die Autovermietung hat nun Ihre Daten und wird Sie kontaktieren. Ihre Kontaktdaten finden Sie in Ihrem Postfach.", expired: "Dieser Angebotslink ist nicht mehr gültig.", expiredOffer: "Dieses Angebot ist abgelaufen. Stellen Sie eine neue Anfrage und lokale Agenturen machen Ihnen wieder ein Angebot.", alreadyTitle: "Bereits angenommen", alreadyBody: "Sie haben bereits ein Angebot angenommen. Die Vermietung wird Sie kontaktieren, ihre Daten sind in Ihrem Postfach.", noOffers: "Ihre Angebote sind unterwegs — schauen Sie bald wieder vorbei.", offersTitle: "Ihre Mietwagen-Angebote", declineLink: "Keines dieser Angebote passt mir", declineDone: "Notiert, kein Problem. Ihre Anfrage ist nun geschlossen.",
    phoneLabel: "Ihr Telefon / WhatsApp", phoneHint: "Die Vermietung ruft Sie an oder schreibt Ihnen, um das Auto zu bestätigen. Das ist der letzte Schritt.", phoneError: "Bitte geben Sie eine Nummer an, unter der die Vermietung Sie erreicht.",
  },
  el: {
    title: "Οι προσφορές ενοικίασής σας", intro: "Επιλέξτε την προσφορά που σας ταιριάζει. Αποδεχτείτε μία και σας συνδέουμε απευθείας με το γραφείο.", request: "Το αίτημά σας", accept: "Αποδοχή προσφοράς", done: "Έγινε αποδοχή! Το γραφείο ενοικίασης έχει τα στοιχεία σας και θα επικοινωνήσει μαζί σας. Τα στοιχεία του είναι στο email σας.", expired: "Αυτός ο σύνδεσμος προσφοράς δεν ισχύει πλέον.", expiredOffer: "Αυτή η προσφορά έχει λήξει. Στείλτε νέο αίτημα και οι τοπικές εταιρείες θα σας προτείνουν νέα τιμή.", alreadyTitle: "Έχει ήδη γίνει αποδοχή", alreadyBody: "Έχετε ήδη αποδεχτεί μια προσφορά. Το γραφείο θα επικοινωνήσει μαζί σας, τα στοιχεία του είναι στο email σας.", noOffers: "Οι προσφορές σας έρχονται, ελέγξτε ξανά σύντομα.", offersTitle: "Οι προσφορές ενοικίασής σας", declineLink: "Καμία από αυτές τις προσφορές δεν μου ταιριάζει", declineDone: "Σημειώθηκε, κανένα πρόβλημα. Το αίτημά σας έκλεισε.",
    phoneLabel: "Το τηλέφωνό σας / WhatsApp", phoneHint: "Το γραφείο σας καλεί ή σας γράφει για να επιβεβαιώσει το αυτοκίνητο. Είναι το τελευταίο βήμα.", phoneError: "Δώστε έναν αριθμό στον οποίο μπορεί να σας βρει το γραφείο.",
  },
};

function OfferCard({
  offer, token, request, locale, c, rank, total, deposit,
}: {
  offer: QuoteOption;
  token: string;
  request: Record<string, unknown>;
  locale: string;
  c: Copy & ReturnType<typeof sharedOfferCopy>;
  /** 1 = l'offre la moins chere. Dit si le client choisit ailleurs que le prix. */
  rank: number;
  total: number;
  /** Présent seulement interrupteur allumé. */
  deposit?: DepositView;
}) {
  const expired = isOfferExpired(offer.created_at, request.date_from as string, Date.now());
  const ct = CAR_TYPES_DATA.find((cc) => cc.id === (request.car_type as string));
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? (request.car_type as string);
  // Mode acompte : montants dans la langue du client (« 41,20 € »), comme l'acompte.
  const fmt = (p: number) =>
    deposit && (offer.currency ?? "EUR") === "EUR" ? formatEur(p, locale) : money(p, offer.currency ?? "EUR");
  const priceStr = fmt(offer.price);
  const incl = inclusionLabels(offer.inclusions ?? null, locale);
  const insLines = insuranceSummary(offer.insurance_type, offer.excess_eur, offer.zero_excess_upsell_eur_day, locale);
  const days = rentalDays(
    request.date_from as string,
    request.date_to as string,
    request.time_from as string | null,
    request.time_to as string | null,
  );
  const perDay = fmt(Math.round(offer.price / days));
  const carLine = quotedModelLabel(offer.car_model, offer.gearbox ? GEARBOX_LABEL[offer.gearbox] : null);
  // Pas de modèle mais une boîte : on la nomme pour ce qu'elle est plutôt que de
  // la laisser occuper la ligne du modèle.
  const gearboxOnly = !carLine && offer.gearbox
    ? (GEARBOX_ONLY[locale] ?? GEARBOX_ONLY.en)[offer.gearbox] ?? null
    : null;

  return (
    <div style={{ ...card, marginBottom: 20, opacity: expired || deposit?.declined ? 0.65 : 1 }}>
      <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
      <h2 style={{ margin: "0 0 6px", fontSize: 28, color: "#0B3954", fontWeight: 800 }}>{priceStr}</h2>
      <p style={{ margin: "0 0 6px", color: "#5C7886", fontSize: 13 }}>{priceStr} {c.total} · ~{perDay} {c.perDay}</p>
      {deposit?.amount != null ? (
        <p style={{ margin: "0 0 6px", color: "#0B3954", fontSize: 14, fontWeight: 700 }}>
          {fill(deposit.dc.dueLine, {
            deposit: formatEur(deposit.amount, locale),
            rest: formatEur(Math.round((offer.price - deposit.amount) * 100) / 100, locale),
          })}
        </p>
      ) : null}
      {offer.partner_name ? <p style={{ margin: "0 0 12px", color: "#0B3954", fontSize: 14 }}>{c.offerFrom} <strong>{offer.partner_name}</strong> · {c.localAgency}</p> : null}
      {carLine ? <p style={{ margin: "0 0 12px", color: "#0B3954", fontSize: 15, fontWeight: 700 }}>{carLine}</p> : null}
      {gearboxOnly ? <p style={{ margin: "0 0 12px", color: "#5C7886", fontSize: 14 }}>{gearboxOnly}</p> : null}
      {/* Le mot du loueur. Sans lui, une offre plus chère parce qu'elle porte une
          catégorie supérieure se lit simplement comme une offre plus chère. */}
      {offer.note ? (
        <p style={{ margin: "0 0 12px", padding: "10px 12px", background: "#FFF8E7", border: "1px solid #FFE2A8", borderRadius: 10, color: "#0B3954", fontSize: 14, lineHeight: 1.5 }}>
          {offer.note}
        </p>
      ) : null}
      <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>{c.intro}</p>

      <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
        <p style={{ margin: "0 0 6px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.request}</p>
        <div>{carPickupLabel(request.pickup_slug as string)}</div>
        <div>{request.date_from as string} → {request.date_to as string}</div>
        <div>{carTypeLabel}</div>
      </div>

      {incl.length ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#0B3954", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 4px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.included}</p>
          {incl.map((x) => <div key={x}>&#10003; {x}</div>)}
        </div>
      ) : null}

      {insLines.length ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#0B3954", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 4px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{CAR_INSURANCE_HEADING[locale] ?? CAR_INSURANCE_HEADING.en}</p>
          {insLines.map((x) => <div key={x}>• {x}</div>)}
        </div>
      ) : null}

      <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
        {c.reassure.map((r) => <p key={r} style={{ margin: "0 0 4px", color: "#0B3954", fontSize: 13 }}>• {r}</p>)}
      </div>
      {c.steps.length ? (
        <ol style={{ margin: "0 0 18px", paddingLeft: 18, color: "#5C7886", fontSize: 13, lineHeight: 1.7 }}>
          {c.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      ) : null}

      {expired ? (
        <p style={refusalBox}>{c.expiredOffer}</p>
      ) : deposit && (deposit.declined || !deposit.bookable || deposit.amount === null) ? (
        // Pas de bouton quand on sait déjà que le paiement serait refusé.
        <p style={refusalBox}>
          {deposit.declined ? deposit.dc.declined : !deposit.bookable ? deposit.dc.refusals.tooClose : deposit.dc.refusals.belowMinimum}
        </p>
      ) : (
        <AcceptButton token={token} optionId={offer.id}
          label={deposit ? (deposit.amount != null ? fill(deposit.dc.book, { deposit: formatEur(deposit.amount, locale) }) : deposit.dc.bookPlain) : c.accept}
          doneText={c.done} expiredText={c.expiredOffer}
          needsPhone={!isCallablePhone(request.customer_phone as string | null)}
          phoneLabel={c.phoneLabel} phoneHint={c.phoneHint} phoneError={c.phoneError}
          rank={rank} offers={total} refusals={deposit?.dc.refusals} />
      )}
    </div>
  );
}

export default async function CarOfferPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  // Interrupteur lu à chaque rendu (page force-dynamic).
  const depositOn = process.env.CAR_CATALOGUE_ENABLED === "on";
  const dc = DEPOSIT_COPY[locale] ?? DEPOSIT_COPY.en;
  const baseCopy = { ...(COPY[locale] ?? COPY.en), ...sharedOfferCopy(locale) };
  // Acompte : plus de « aucun prépaiement » ni d'étapes de mise en relation,
  // qui seraient fausses. Les deux règles qui comptent prennent leur place.
  const c = depositOn
    ? { ...baseCopy, intro: dc.intro, phoneHint: dc.phoneHint, done: dc.alreadyBody, reassure: [dc.confirmLine, dc.cancelLine], steps: [] as string[] }
    : baseCopy;

  const found = await requestByClientToken(token);
  if (!found) notFound();
  const { request, options } = found;
  // Les offres sous le plancher (prix bidon d'un loueur sans voiture) ne sont jamais
  // montrees ; les 3 moins cheres sont depliees, le reste replie. Voir curateOffers.
  const curated = curateOffers(
    options,
    rentalDays(request.date_from as string, request.date_to as string, request.time_from as string | null, request.time_to as string | null),
  );
  const offers = [...curated.shown, ...curated.folded];
  const more = (MORE_OFFERS[locale] ?? MORE_OFFERS.en).replace("{n}", String(curated.folded.length));

  // Acompte par offre (taux du loueur), réservabilité (même règle que le
  // paiement, durée de la session comprise) et offres déclinées par leur loueur.
  let depositFor: (o: QuoteOption) => DepositView | undefined = () => undefined;
  if (depositOn && offers.length > 0 && request.status !== "accepted") {
    const rates = await depositRatesFor(offers.map((o) => o.partner_id));
    const bookable = isDepositBookable(Date.now(), request.date_from as string, request.time_from as string | null);
    const declinedInvites = new Set(found.quotes.filter((q) => q.status === "declined").map((q) => q.id));
    depositFor = (o) => {
      const rate = rates.get(o.partner_id);
      return { amount: rate === undefined ? undefined : depositEur(o.price, rate), bookable, declined: declinedInvites.has(o.invite_id), dc };
    };
  }

  // Props de mesure, calculées ici une fois : le client qui ouvre cette page est
  // le maillon qu'on ne voyait pas. Voir src/lib/car-offer-metrics.ts.
  const beacon = (state: "offers" | "none_yet" | "already_accepted") => (
    <OfferBeacon
      token={token}
      props={offerViewProps({
        state,
        prices: offers.map((o) => o.price),
        dateFrom: request.date_from as string | null,
        locale,
        now: Date.now(),
      })}
    />
  );

  // Etat : déjà accepté
  if (request.status === "accepted") {
    return (
      <main style={shell}>
        {beacon("already_accepted")}
        <div style={card}>
          <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
          {/* Une acceptation d'avant l'allumage garde son texte de mise en relation. */}
          <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>{depositOn && request.booking_status != null ? dc.alreadyTitle : c.alreadyTitle}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{depositOn && request.booking_status != null ? dc.alreadyBody : c.alreadyBody}</p>
        </div>
      </main>
    );
  }

  // Etat : aucune offre disponible encore
  if (offers.length === 0) {
    return (
      <main style={shell}>
        {beacon("none_yet")}
        <div style={card}>
          <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>{c.offersTitle}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.noOffers}</p>
        </div>
      </main>
    );
  }

  // Etat : une ou plusieurs offres à comparer
  return (
    <main style={shell}>
      {beacon("offers")}
      <p style={{ margin: "0 0 6px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", textAlign: "center" }}>crete · direct</p>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#0B3954", fontWeight: 800, textAlign: "center" }}>{c.offersTitle}</h1>
      {curated.shown.map((offer, i) => (
        <OfferCard key={offer.id} offer={offer} token={token} request={request} locale={locale} c={c}
          rank={i + 1} total={offers.length} deposit={depositFor(offer)} />
      ))}
      {curated.folded.length > 0 && (
        <details style={{ margin: "4px 0 16px" }}>
          <summary style={{ cursor: "pointer", color: "#0B3954", fontSize: 15, fontWeight: 700, padding: "10px 0", listStyle: "none", textAlign: "center" }}>
            {more}
          </summary>
          {curated.folded.map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} token={token} request={request} locale={locale} c={c}
              rank={curated.shown.length + i + 1} total={offers.length} deposit={depositFor(offer)} />
          ))}
        </details>
      )}
      <DeclineButton token={token} label={c.declineLink} doneText={c.declineDone} offers={offers.length}
        inProgressText={depositOn ? dc.refusals.inProgress : undefined} />
    </main>
  );
}
