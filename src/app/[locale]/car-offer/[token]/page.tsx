import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { pickupLabel } from "@/lib/car-pickup-labels";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import type { AcceptRefusals } from "./AcceptButton";
import { OfferRow, PickCard, type OfferItem } from "./OfferShowcase";
import { isCallablePhone } from "@/lib/car-lead";
import { DeclineButton } from "./DeclineButton";
import { OfferBeacon } from "./OfferBeacon";
import { offerViewProps } from "@/lib/car-offer-metrics";
import { inclusionLabels, insuranceSummary } from "@/lib/car-inclusions";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { sharedOfferCopy } from "@/lib/car-offer-copy";
import { requestByClientToken } from "@/lib/car-quotes-db";
import { rentalDays } from "@/lib/car-pricing";
import { curateOffers } from "@/lib/car-quotes";
import type { QuoteOption } from "@/lib/car-quotes";
import { depositEur, takesDeposits, type CarCategory } from "@/lib/car-catalogue";
import { clientCancelNowEur, isDepositBookable, type RefundReason } from "@/lib/car-deposit";
import { depositPartnersFor } from "@/lib/car-deposit-server";
import { L, fill, pickCarBookingLocale, REFUND_REASON_KEY } from "../../car-booking/content";
import { formatEur, formatAthensDeadline, formatWallDate } from "@/lib/car-format";
import CancelPanel from "../../car-booking/[token]/CancelPanel";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { partnerRatings } from "@/lib/car-trust-server";
import { CANCEL_LINE, CONFIRM_LINE, formatRating, partnerRevealed } from "@/lib/car-trust";
import { PartnerReveal } from "@/components/car-rental/PartnerReveal";
import { offerCarPhoto } from "@/lib/car-fleet";
import { OFFER_VIEW, daysLabel, gearboxLabel, offerLang, priceDelta, recommendOffer } from "@/lib/car-offer-view";

// Libellé QUALIFIÉ de la boîte, pour les devis sans modèle de voiture. Affiché à
// la place du modèle, « Manual » tout seul se lit comme un nom de voiture : c'est
// ce qu'ont vu les clients des demandes 25 et 33. Ici le mot dit ce qu'il est.
const GEARBOX_ONLY: Record<string, Record<string, string>> = {
  en: { automatic: "Automatic gearbox", manual: "Manual gearbox" },
  fr: { automatic: "Boîte automatique", manual: "Boîte manuelle" },
  de: { automatic: "Automatikgetriebe", manual: "Schaltgetriebe" },
  el: { automatic: "Αυτόματο κιβώτιο", manual: "Χειροκίνητο κιβώτιο" },
};

// Acompte (interrupteur CAR_CATALOGUE_ENABLED) : textes qui remplacent ceux de
// la mise en relation. Interrupteur éteint, seuls les refus (`refusals`) sont
// lus : un acompte ouvert avant l'extinction suit son cours, et la mise en
// relation comme le refus de toutes les offres répondent alors 409.
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
    confirmLine: CONFIRM_LINE.en,
    cancelLine: CANCEL_LINE.en,
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
    confirmLine: CONFIRM_LINE.fr,
    cancelLine: CANCEL_LINE.fr,
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
    confirmLine: CONFIRM_LINE.de,
    cancelLine: CANCEL_LINE.de,
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
    confirmLine: CONFIRM_LINE.el,
    cancelLine: CANCEL_LINE.el,
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


export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto px-4 py-7 sm:px-6 ${wide ? "max-w-5xl" : "max-w-xl"}`}>{children}</main>;
}
function StateCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-base p-6">
      <h1 className="m-0 mb-2 font-heading text-[22px] font-extrabold text-ink">{title}</h1>
      {children}
    </div>
  );
}
const Lead = ({ children }: { children: ReactNode }) => <p className="m-0 text-[15.5px] leading-relaxed text-text-muted">{children}</p>;

type Copy = {
  title: string; intro: string; request: string; accept: string; done: string;
  expired: string; expiredOffer: string; alreadyTitle: string; alreadyBody: string;
  noOffers: string; offersTitle: string; declineLink: string; declineDone: string;
  phoneLabel: string; phoneHint: string; phoneError: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Your car rental quotes", intro: "Choose the offer that suits you. Accept one and we connect you directly with the rental agency.", request: "Your request", accept: "Accept this offer", done: "Accepted! The rental agency now has your details and will contact you. Check your inbox for their contact info.", expired: "This offer link is no longer valid.", expiredOffer: "This offer has expired. Send a new request and local agencies will quote you again.", alreadyTitle: "Already accepted", alreadyBody: "You already accepted an offer. The rental agency will contact you, and their details are in your inbox.", noOffers: "Your offers are on the way, check back shortly.", offersTitle: "Your car rental offers", declineLink: "None of these offers suits me", declineDone: "Noted, no problem. This request is now closed.",
    phoneLabel: "Your phone / WhatsApp", phoneHint: "The agency calls or texts you to confirm the car. This is the only step left.", phoneError: "Please enter a number the agency can reach you on.",
  },
  fr: {
    title: "Vos devis de location", intro: "Choisissez l'offre qui vous convient. Acceptez-en une et nous vous mettons directement en relation avec l'agence.", request: "Votre demande", accept: "Accepter cette offre", done: "Accepté ! L'agence de location a maintenant vos coordonnées et va vous contacter. Ses coordonnées sont dans votre boîte mail.", expired: "Ce lien d'offre n'est plus valide.", expiredOffer: "Cette offre a expiré. Refaites une demande et les agences locales vous proposeront un nouveau prix.", alreadyTitle: "Déjà accepté", alreadyBody: "Vous avez déjà accepté une offre. L'agence va vous contacter, ses coordonnées sont dans votre boîte mail.", noOffers: "Vos offres arrivent, revenez bientôt.", offersTitle: "Vos offres de location", declineLink: "Aucune de ces offres ne me convient", declineDone: "Noté, pas de souci. Votre demande est clôturée.",
    phoneLabel: "Votre téléphone / WhatsApp", phoneHint: "L'agence vous appelle ou vous écrit pour confirmer la voiture. C'est la dernière étape.", phoneError: "Indiquez un numéro sur lequel l'agence peut vous joindre.",
  },
  de: {
    title: "Ihre Mietwagen-Angebote", intro: "Wählen Sie das passende Angebot. Nehmen Sie eines an und wir verbinden Sie direkt mit der Autovermietung.", request: "Ihre Anfrage", accept: "Angebot annehmen", done: "Angenommen! Die Autovermietung hat nun Ihre Daten und wird Sie kontaktieren. Ihre Kontaktdaten finden Sie in Ihrem Postfach.", expired: "Dieser Angebotslink ist nicht mehr gültig.", expiredOffer: "Dieses Angebot ist abgelaufen. Stellen Sie eine neue Anfrage und lokale Agenturen machen Ihnen wieder ein Angebot.", alreadyTitle: "Bereits angenommen", alreadyBody: "Sie haben bereits ein Angebot angenommen. Die Vermietung wird Sie kontaktieren, ihre Daten sind in Ihrem Postfach.", noOffers: "Ihre Angebote sind unterwegs, schauen Sie bald wieder vorbei.", offersTitle: "Ihre Mietwagen-Angebote", declineLink: "Keines dieser Angebote passt mir", declineDone: "Notiert, kein Problem. Ihre Anfrage ist nun geschlossen.",
    phoneLabel: "Ihr Telefon / WhatsApp", phoneHint: "Die Vermietung ruft Sie an oder schreibt Ihnen, um das Auto zu bestätigen. Das ist der letzte Schritt.", phoneError: "Bitte geben Sie eine Nummer an, unter der die Vermietung Sie erreicht.",
  },
  el: {
    title: "Οι προσφορές ενοικίασής σας", intro: "Επιλέξτε την προσφορά που σας ταιριάζει. Αποδεχτείτε μία και σας συνδέουμε απευθείας με το γραφείο.", request: "Το αίτημά σας", accept: "Αποδοχή προσφοράς", done: "Έγινε αποδοχή! Το γραφείο ενοικίασης έχει τα στοιχεία σας και θα επικοινωνήσει μαζί σας. Τα στοιχεία του είναι στο email σας.", expired: "Αυτός ο σύνδεσμος προσφοράς δεν ισχύει πλέον.", expiredOffer: "Αυτή η προσφορά έχει λήξει. Στείλτε νέο αίτημα και οι τοπικές εταιρείες θα σας προτείνουν νέα τιμή.", alreadyTitle: "Έχει ήδη γίνει αποδοχή", alreadyBody: "Έχετε ήδη αποδεχτεί μια προσφορά. Το γραφείο θα επικοινωνήσει μαζί σας, τα στοιχεία του είναι στο email σας.", noOffers: "Οι προσφορές σας έρχονται, ελέγξτε ξανά σύντομα.", offersTitle: "Οι προσφορές ενοικίασής σας", declineLink: "Καμία από αυτές τις προσφορές δεν μου ταιριάζει", declineDone: "Σημειώθηκε, κανένα πρόβλημα. Το αίτημά σας έκλεισε.",
    phoneLabel: "Το τηλέφωνό σας / WhatsApp", phoneHint: "Το γραφείο σας καλεί ή σας γράφει για να επιβεβαιώσει το αυτοκίνητο. Είναι το τελευταίο βήμα.", phoneError: "Δώστε έναν αριθμό στον οποίο μπορεί να σας βρει το γραφείο.",
  },
};

export default async function CarOfferPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  // Une seule horloge par rendu : toutes les règles de délai lisent le même instant.
  const now = Date.now();
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
  // montrees (curateOffers). Les autres sont toutes listées, triées par prix.
  const days = rentalDays(request.date_from as string, request.date_to as string, request.time_from as string | null, request.time_to as string | null);
  const curated = curateOffers(options, days);
  const offers = [...curated.shown, ...curated.folded];

  // Acompte par offre (taux du loueur), réservabilité (même règle que le
  // paiement, durée de la session comprise) et offres déclinées par leur loueur.
  // Un loueur qui ne prend pas l'acompte (inactif, sans les conditions 2027, en
  // relais) garde la carte de la mise en relation, comme la route d'acceptation
  // (spec section 9) ; un loueur suspendu n'est plus réservable.
  let depositFor: (o: QuoteOption) => DepositView | undefined = () => undefined;
  if (depositOn && offers.length > 0 && request.status !== "accepted") {
    const partners = await depositPartnersFor(offers.map((o) => o.partner_id));
    const bookable = isDepositBookable(now, request.date_from as string, request.time_from as string | null);
    const declinedInvites = new Set(found.quotes.filter((q) => q.status === "declined").map((q) => q.id));
    depositFor = (o) => {
      const p = partners.get(o.partner_id);
      if (p && !takesDeposits(p)) return undefined;
      const rate = p?.commission == null ? undefined : Number(p.commission);
      return {
        amount: rate === undefined ? undefined : depositEur(o.price, rate),
        bookable,
        declined: declinedInvites.has(o.invite_id) || p?.rates_status === "paused",
        dc,
      };
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
        now: now,
      })}
    />
  );

  // Etat : réservation avec acompte en cours ou annulée avec acompte gardé. Les
  // e-mails du client pointent ici (seul le hash du jeton de réservation est
  // stocké) : il y suit sa réservation et peut l'annuler (R43). Lu sur
  // booking_status, qui n'existe qu'avec l'acompte, et non sur l'interrupteur :
  // l'éteindre ne doit pas priver un client qui a payé de sa page.
  const bs = request.booking_status as string | null;
  if (bs === "awaiting_partner" || bs === "confirmed" || bs === "cancelled_kept") {
    const lang = pickCarBookingLocale(locale);
    const t = L[lang];
    const partner = (request.partner_name as string | null) ?? "";
    const deposit = Number(request.deposit_eur);
    const deadline = request.confirm_deadline_at as string | null;
    const title = bs === "awaiting_partner" ? t.awaitingTitle : bs === "confirmed" ? t.confirmedTitle : t.keptTitle;
    const body = bs === "cancelled_kept"
      ? t.keptBody
      : bs === "confirmed"
        ? fill(t.confirmedBody, { partner })
        : deadline
          ? fill(t.awaitingBody, { partner, deadline: formatAthensDeadline(deadline, lang) })
          : t.depositConfirmRule;
    const refundNow = clientCancelNowEur(bs, deposit, request.date_from as string, request.time_from as string | null, now);
    // M11 : réservation confirmée = coordonnées du loueur, comme sur /car-booking
    // (les e-mails du client ne portent que ce lien-ci).
    let contact: { name: string; phone: string | null; whatsapp: string | null; email: string | null; address: string } | null = null;
    if (bs === "confirmed" && request.quoted_by_partner_id != null) {
      const { data: p } = await supabaseAdmin
        .from("car_partners")
        .select("name, phone, whatsapp, email, address_line, postal_code, city")
        .eq("id", request.quoted_by_partner_id as number)
        .maybeSingle();
      if (p) {
        contact = {
          name: p.name as string,
          phone: (p.phone as string | null) ?? null,
          whatsapp: (p.whatsapp as string | null) ?? null,
          email: (p.email as string | null) ?? null,
          address: [p.address_line, [p.postal_code, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        };
      }
    }
    return (
      <Shell>
        {beacon("already_accepted")}
        <StateCard title={title}>
          <Lead>{body}</Lead>
          {bs === "cancelled_kept" ? null : (
            <>
              <div className="mt-5 mb-3.5 flex flex-col gap-1 rounded-2xl border border-border bg-foam px-4 py-3.5 text-[14.5px] text-ink">
                {partner ? <p className="m-0 font-heading font-bold">{partner}</p> : null}
                <p className="m-0">
                  {pickupLabel(request.pickup_slug as string, lang)} · {formatWallDate(request.date_from as string, request.time_from as string | null, lang)}
                  {" → "}{formatWallDate(request.date_to as string, request.time_to as string | null, lang)}
                </p>
                <p className="m-0 flex justify-between gap-3">
                  <span>{t.depositPaidLabel}</span>
                  <strong className="font-heading">{formatEur(deposit, lang)}</strong>
                </p>
              </div>
              {contact ? (
                <div className="mb-3.5 flex flex-col gap-1 rounded-2xl border border-border bg-white px-4 py-3.5 text-[15px] text-ink">
                  <p className="m-0 mb-1 font-heading text-[12px] font-bold uppercase tracking-wide text-text-muted">{t.contactHeading}</p>
                  <p className="m-0 font-heading font-bold">{contact.name}</p>
                  {contact.phone ? <a className="text-lagoon-deep" href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
                  {contact.whatsapp && contact.whatsapp !== contact.phone ? <span>WhatsApp {contact.whatsapp}</span> : null}
                  {contact.email ? <a className="text-lagoon-deep" href={`mailto:${contact.email}`}>{contact.email}</a> : null}
                  {contact.address ? <span className="text-text-muted">{contact.address}</span> : null}
                </div>
              ) : null}
              <p className="m-0 text-[13.5px] leading-relaxed text-text-muted">{t.depositCancelRule}</p>
            </>
          )}
        </StateCard>
        {/* Acompte payé : le loueur se révèle (nom ci-dessus, note complète et avis ici). */}
        {bs !== "cancelled_kept" && partnerRevealed({ bookingStatus: bs, requestStatus: request.status as string }) ? (
          <PartnerReveal partnerId={(request.quoted_by_partner_id as number | null) ?? null} locale={lang} stacked className="mt-5" />
        ) : null}
        {refundNow === null ? null : (
          <div className="mt-5">
            <CancelPanel auth={{ offerToken: token }} strings={t} locale={lang} refundEur={refundNow} />
          </div>
        )}
      </Shell>
    );
  }

  // Bandeau après un remboursement (refus, silence, annulation) : le lien
  // « Gérer » des e-mails mène ici, le client doit y lire que son acompte lui
  // revient et combien. La demande est rouverte aux autres offres (status
  // quoted) ou encore en cours de remboursement (status accepted).
  let refundNotice: ReactNode = null;
  if (bs === "refunded") {
    const lang = pickCarBookingLocale(locale);
    const t = L[lang];
    const reasonKey = REFUND_REASON_KEY[request.refund_reason as RefundReason];
    const deposit = Number(request.deposit_eur);
    refundNotice = (
      <div role="status" className="mb-5 rounded-2xl border border-ok/40 bg-ok/10 px-4 py-3.5 text-[15px] leading-relaxed text-ink">
        <p className="m-0 mb-1 font-bold">{t.refundedTitle}</p>
        {reasonKey ? <p className="m-0 mb-1">{t[reasonKey]}</p> : null}
        <p className="m-0">
          {Number.isFinite(deposit) && deposit > 0 ? fill(t.refundedAmountBody, { amount: formatEur(deposit, lang) }) : t.refundedBody}
        </p>
      </div>
    );
  }

  // Etat : déjà accepté. Remboursement en cours : seul le bandeau, la
  // réservation n'existe plus. accepted + refunded n'est JAMAIS une mise en
  // relation faite après un remboursement : l'ancien parcours efface
  // accept_token_hash, la page n'est alors plus joignable par ce jeton (404).
  if (request.status === "accepted" && refundNotice) {
    return <Shell>{beacon("already_accepted")}{refundNotice}</Shell>;
  }
  if (request.status === "accepted") {
    // Une acceptation d'avant l'allumage garde son texte de mise en relation.
    const deposited = depositOn && request.booking_status != null;
    return (
      <Shell>
        {beacon("already_accepted")}
        <StateCard title={deposited ? dc.alreadyTitle : c.alreadyTitle}>
          <Lead>{deposited ? dc.alreadyBody : c.alreadyBody}</Lead>
        </StateCard>
        {/* Offre acceptée : le loueur se révèle, nom, note complète et avis. */}
        {partnerRevealed({ bookingStatus: bs, requestStatus: request.status as string }) ? (
          <PartnerReveal
            partnerId={(request.quoted_by_partner_id as number | null) ?? null} locale={locale}
            name={(request.partner_name as string | null) || null} stacked className="mt-5"
          />
        ) : null}
      </Shell>
    );
  }

  // Etat : aucune offre disponible encore
  if (offers.length === 0) {
    return (
      <Shell>
        {beacon("none_yet")}
        {refundNotice}
        <StateCard title={c.offersTitle}><Lead>{c.noOffers}</Lead></StateCard>
      </Shell>
    );
  }

  // Etat : une ou plusieurs offres à comparer. Une offre sans acompte garde les
  // textes de la mise en relation (« Accepter cette offre », « Accepté ! »).
  const copyFor = (o: QuoteOption) => (depositFor(o) ? c : baseCopy);
  // Interrupteur éteint aussi : un paiement ouvert avant l'extinction bloque la
  // mise en relation (409 inProgress), le client doit lire pourquoi.
  const refusals = dc.refusals;
  const v = OFFER_VIEW[offerLang(locale)];
  const category = request.car_type as CarCategory;

  // Confiance : note Google des loueurs (en base, relevé hebdomadaire), chiffre seul.
  // ⛔ Ici le loueur n'est pas encore connu du client (décision du 27/11/2026) : ni nom,
  // ni nombre d'avis, ni avis, ni lien Maps, ni place_id ; reviewsForPlace n'est donc pas
  // appelé. Il se révèle après l'acompte ou l'acceptation (PartnerReveal, plus haut).
  // Même une demande remboursée, rouverte à d'autres offres : ces agences-là n'ont rien reçu.
  const ratings = new Map((await partnerRatings([...new Set(offers.map((o) => o.partner_id))])).map((r) => [r.id, r]));
  const ratingOf = (o: QuoteOption): number | null => {
    const r = ratings.get(o.partner_id);
    const rating = r?.google_rating == null ? NaN : Number(r.google_rating);
    const count = r?.google_rating_count == null ? 0 : Number(r.google_rating_count);
    return Number.isFinite(rating) && count > 0 ? rating : null;
  };

  // Ce qui empêche de réserver une offre (expirée, refusée par le loueur, trop proche, acompte trop bas).
  const blockedFor = (o: QuoteOption): string | null => {
    const deposit = depositFor(o);
    if (isOfferExpired(o.created_at, request.date_from as string, now)) return copyFor(o).expiredOffer;
    if (deposit?.declined) return deposit.dc.declined;
    if (deposit && !deposit.bookable) return deposit.dc.refusals.tooClose;
    if (deposit && deposit.amount === null) return deposit.dc.refusals.belowMinimum;
    return null;
  };
  // « Notre choix » ne recommande qu'une offre réservable ; si aucune ne l'est, la moins chère reste en tête.
  const bookableOffers = offers.filter((o) => blockedFor(o) === null);
  const pool = bookableOffers.length ? bookableOffers : offers;
  const pick = recommendOffer(pool, ratingOf) ?? offers[0];
  const others = offers.filter((o) => o.id !== pick.id);
  const daysText = daysLabel(days, locale);
  const needsPhone = !isCallablePhone(request.customer_phone as string | null);

  const itemFor = (o: QuoteOption): OfferItem => {
    const deposit = depositFor(o);
    const cc = copyFor(o);
    const euro = (o.currency ?? "EUR") === "EUR";
    const fmt = (n: number) => (euro ? formatEur(n, locale) : `${n} ${o.currency}`);
    const blockedText = blockedFor(o);
    const photo = offerCarPhoto(o.partner_id, category, o.car_model);
    const model = o.car_model?.trim() || null;
    // Sans modèle, la boîte seule se lirait comme un nom de voiture : libellé qualifié.
    const gearbox = model
      ? gearboxLabel(o.gearbox, locale)
      : o.gearbox ? (GEARBOX_ONLY[locale] ?? GEARBOX_ONLY.en)[o.gearbox] ?? null : null;
    return {
      id: o.id, token, price: o.price, priceText: fmt(o.price),
      splitText: deposit?.amount != null
        ? fill(deposit.dc.dueLine, { deposit: formatEur(deposit.amount, locale), rest: formatEur(Math.round((o.price - deposit.amount) * 100) / 100, locale) })
        : null,
      rating: ratingOf(o),
      photo, model, gearbox,
      // M8 : sur une offre de grille, la « note » est la règle d'annulation du
      // loueur ; avec l'acompte, seule celle de crete.direct s'applique.
      note: deposit && o.source === "catalogue" ? null : o.note,
      insurance: insuranceSummary(o.insurance_type, o.excess_eur, o.zero_excess_upsell_eur_day, locale),
      inclusions: inclusionLabels(o.inclusions ?? null, locale),
      blockedText,
      buttonLabel: deposit
        ? deposit.amount != null ? fill(deposit.dc.book, { deposit: formatEur(deposit.amount, locale) }) : deposit.dc.bookPlain
        : cc.accept,
      doneText: cc.done, expiredText: cc.expiredOffer,
      needsPhone, phoneLabel: cc.phoneLabel, phoneHint: cc.phoneHint, phoneError: cc.phoneError,
      errorText: v.tryAgain,
      rank: offers.indexOf(o) + 1, total: offers.length, refusals,
    };
  };

  const pickRating = ratingOf(pick);
  // La raison compare l'offre aux offres encore réservables, jamais à une offre morte.
  const reason = offers.length === 1
    ? v.onlyOffer
    : pool.length === 1
      ? v.onlyBookable
      : pickRating
        ? fill(v.reasonRated, { n: String(pool.length), rating: formatRating(pickRating, locale) })
        : fill(v.reasonPlain, { n: String(pool.length) });
  const pickCopy = copyFor(pick);
  const ct = CAR_TYPES_DATA.find((x) => x.id === category);

  return (
    <Shell wide>
      {beacon("offers")}
      {/* M10 : un paiement ouvert se voit dès l'ouverture, pas après un clic. */}
      {bs === "pending_payment" ? (
        <p role="status" className="m-0 mb-4 rounded-2xl bg-warn/15 px-4 py-3 text-[15px] leading-relaxed text-ink">{v.pendingPayment}</p>
      ) : null}
      {refundNotice}
      <h1 className="m-0 mb-1 font-heading text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">{c.offersTitle}</h1>
      <p className="m-0 mb-5 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-text-muted">
        <span className="font-bold text-ink">{pickupLabel(request.pickup_slug as string, locale)}</span>
        <span>{formatWallDate(request.date_from as string, request.time_from as string | null, locale)} → {formatWallDate(request.date_to as string, request.time_to as string | null, locale)}</span>
        <span>{daysText}</span>
        {ct ? <span>{ct.labels[locale] ?? ct.labels.en}</span> : null}
      </p>
      <PickCard
        item={itemFor(pick)} v={v} locale={locale}
        eyebrow={offers.length > 1 ? fill(v.ourPick, { n: String(offers.length) }) : v.yourOffer}
        reason={reason} daysText={daysText} guarantees={pickCopy.reassure ?? []}
        revealLine={depositFor(pick) ? v.revealLine : v.revealLineNoDeposit}
      />
      {pickCopy.steps?.length ? (
        <ol className="m-0 mt-4 list-decimal pl-5 text-[14px] leading-relaxed text-text-muted">
          {pickCopy.steps.map((st) => <li key={st}>{st}</li>)}
        </ol>
      ) : null}
      {others.length ? (
        <section aria-labelledby="others-title" className="mt-9">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="others-title" className="m-0 font-heading text-[22px] font-extrabold text-ink">
              {others.length === 1 ? v.otherOffer : fill(v.otherOffers, { n: String(others.length) })}
            </h2>
            <span className="text-[13.5px] text-text-muted">{fill(v.totalFor, { days: daysText })}</span>
          </div>
          <ul className="m-0 list-none divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white p-0">
            {others.map((o) => (
              <OfferRow key={o.id} item={itemFor(o)} v={v} locale={locale} delta={priceDelta(o.price, pick.price)} />
            ))}
          </ul>
        </section>
      ) : null}
      {offers.every((o) => depositFor(o)) ? <p className="m-0 mt-4 text-[13.5px] leading-relaxed text-text-muted">{v.everyOffer} {CONFIRM_LINE[locale] ?? CONFIRM_LINE.en}.</p> : null}
      <div className="mt-6">
        <DeclineButton token={token} label={c.declineLink} doneText={c.declineDone} offers={offers.length}
          inProgressText={dc.refusals.inProgress} />
      </div>
    </Shell>
  );
}
