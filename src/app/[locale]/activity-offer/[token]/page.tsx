import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AcceptButton } from "./AcceptButton";
import { DeclineButton } from "./DeclineButton";
import { activityInclusionLabels } from "@/lib/activity-inclusions";
import { isOfferExpired } from "@/lib/car-offer-expiry";
import { requestByClientToken } from "@/lib/activity-quotes-db";
import { sortQuotesByPrice } from "@/lib/activity-quotes";
import { categoryLabel, cityLabel } from "@/lib/activity-taxonomy";
import type { QuoteInvite } from "@/lib/activity-quotes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

const money = (p: number) => `€${p}`;

type Copy = {
  title: string; intro: string; request: string; accept: string; done: string;
  expired: string; expiredOffer: string; alreadyTitle: string; alreadyBody: string;
  noOffers: string; offersTitle: string; declineLink: string; declineDone: string;
  forWholeGroup: string; included: string; offerFrom: string; localProvider: string;
  groupLabel: (adults: number, children: number) => string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Your activity quotes",
    intro: "Choose the offer that suits you. Accept one and we connect you directly with the provider.",
    request: "Your request",
    accept: "Accept this offer",
    done: "Accepted! The provider now has your details and will contact you. Check your inbox for their contact info.",
    expired: "This offer link is no longer valid.",
    expiredOffer: "This offer has expired. Send a new request and local providers will quote you again.",
    alreadyTitle: "Already accepted",
    alreadyBody: "You already accepted an offer. The provider will contact you, and their details are in your inbox.",
    noOffers: "Your offers are on the way — check back shortly.",
    offersTitle: "Your activity offers",
    declineLink: "None of these offers suits me",
    declineDone: "Noted, no problem. This request is now closed.",
    forWholeGroup: "for your whole group",
    included: "Included in the price",
    offerFrom: "Offer from",
    localProvider: "local activity provider in Crete",
    groupLabel: (adults, children) => {
      const parts: string[] = [];
      if (adults) parts.push(`${adults} adult${adults > 1 ? "s" : ""}`);
      if (children) parts.push(`${children} child${children > 1 ? "ren" : ""}`);
      return parts.join(", ");
    },
  },
  fr: {
    title: "Vos devis d'activité",
    intro: "Choisissez l'offre qui vous convient. Acceptez-en une et nous vous mettons directement en relation avec le prestataire.",
    request: "Votre demande",
    accept: "Accepter cette offre",
    done: "Accepté ! Le prestataire a maintenant vos coordonnées et va vous contacter. Ses coordonnées sont dans votre boîte mail.",
    expired: "Ce lien d'offre n'est plus valide.",
    expiredOffer: "Cette offre a expiré. Refaites une demande et les prestataires locaux vous proposeront un nouveau prix.",
    alreadyTitle: "Déjà accepté",
    alreadyBody: "Vous avez déjà accepté une offre. Le prestataire va vous contacter, ses coordonnées sont dans votre boîte mail.",
    noOffers: "Vos offres arrivent, revenez bientôt.",
    offersTitle: "Vos offres d'activité",
    declineLink: "Aucune de ces offres ne me convient",
    declineDone: "Noté, pas de souci. Votre demande est clôturée.",
    forWholeGroup: "pour votre groupe",
    included: "Inclus dans le prix",
    offerFrom: "Offre de",
    localProvider: "prestataire local d'activité en Crète",
    groupLabel: (adults, children) => {
      const parts: string[] = [];
      if (adults) parts.push(`${adults} adulte${adults > 1 ? "s" : ""}`);
      if (children) parts.push(`${children} enfant${children > 1 ? "s" : ""}`);
      return parts.join(", ");
    },
  },
  de: {
    title: "Ihre Aktivitäts-Angebote",
    intro: "Wählen Sie das passende Angebot. Nehmen Sie eines an und wir verbinden Sie direkt mit dem Anbieter.",
    request: "Ihre Anfrage",
    accept: "Angebot annehmen",
    done: "Angenommen! Der Anbieter hat nun Ihre Daten und wird Sie kontaktieren. Ihre Kontaktdaten finden Sie in Ihrem Postfach.",
    expired: "Dieser Angebotslink ist nicht mehr gültig.",
    expiredOffer: "Dieses Angebot ist abgelaufen. Stellen Sie eine neue Anfrage und lokale Anbieter machen Ihnen wieder ein Angebot.",
    alreadyTitle: "Bereits angenommen",
    alreadyBody: "Sie haben bereits ein Angebot angenommen. Der Anbieter wird Sie kontaktieren, seine Daten sind in Ihrem Postfach.",
    noOffers: "Ihre Angebote sind unterwegs — schauen Sie bald wieder vorbei.",
    offersTitle: "Ihre Aktivitäts-Angebote",
    declineLink: "Keines dieser Angebote passt mir",
    declineDone: "Notiert, kein Problem. Ihre Anfrage ist nun geschlossen.",
    forWholeGroup: "für Ihre ganze Gruppe",
    included: "Im Preis enthalten",
    offerFrom: "Angebot von",
    localProvider: "lokaler Aktivitätsanbieter auf Kreta",
    groupLabel: (adults, children) => {
      const parts: string[] = [];
      if (adults) parts.push(`${adults} Erwachsene${adults === 1 ? "r" : ""}`);
      if (children) parts.push(`${children} Kind${children > 1 ? "er" : ""}`);
      return parts.join(", ");
    },
  },
  el: {
    title: "Οι προσφορές δραστηριότητάς σας",
    intro: "Επιλέξτε την προσφορά που σας ταιριάζει. Αποδεχτείτε μία και σας συνδέουμε απευθείας με τον πάροχο.",
    request: "Το αίτημά σας",
    accept: "Αποδοχή προσφοράς",
    done: "Έγινε αποδοχή! Ο πάροχος έχει τα στοιχεία σας και θα επικοινωνήσει μαζί σας. Τα στοιχεία του είναι στο email σας.",
    expired: "Αυτός ο σύνδεσμος προσφοράς δεν ισχύει πλέον.",
    expiredOffer: "Αυτή η προσφορά έχει λήξει. Στείλτε νέο αίτημα και οι τοπικοί πάροχοι θα σας προτείνουν νέα τιμή.",
    alreadyTitle: "Έχει ήδη γίνει αποδοχή",
    alreadyBody: "Έχετε ήδη αποδεχτεί μια προσφορά. Ο πάροχος θα επικοινωνήσει μαζί σας, τα στοιχεία του είναι στο email σας.",
    noOffers: "Οι προσφορές σας έρχονται, ελέγξτε ξανά σύντομα.",
    offersTitle: "Οι προσφορές δραστηριότητάς σας",
    declineLink: "Καμία από αυτές τις προσφορές δεν μου ταιριάζει",
    declineDone: "Σημειώθηκε, κανένα πρόβλημα. Το αίτημά σας έκλεισε.",
    forWholeGroup: "για ολόκληρη την ομάδα σας",
    included: "Περιλαμβάνεται στην τιμή",
    offerFrom: "Προσφορά από",
    localProvider: "τοπικός πάροχος δραστηριότητας στην Κρήτη",
    groupLabel: (adults, children) => {
      const parts: string[] = [];
      if (adults) parts.push(`${adults} ενήλικ${adults === 1 ? "ας" : "ες"}`);
      if (children) parts.push(`${children} παιδ${children === 1 ? "ί" : "ιά"}`);
      return parts.join(", ");
    },
  },
};

function OfferCard({
  offer, token, request, locale, c,
}: {
  offer: QuoteInvite;
  token: string;
  request: Record<string, unknown>;
  locale: string;
  c: Copy;
}) {
  const expired = isOfferExpired(offer.quoted_at, request.activity_date as string, Date.now());
  const priceStr = money(offer.quote_price!);
  const incl = activityInclusionLabels(offer.quote_inclusions ?? null, locale);

  return (
    <div style={{ ...card, marginBottom: 20, opacity: expired ? 0.65 : 1 }}>
      <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
      <h2 style={{ margin: "0 0 6px", fontSize: 28, color: "#0B3954", fontWeight: 800 }}>{priceStr}</h2>
      <p style={{ margin: "0 0 14px", color: "#5C7886", fontSize: 13 }}>{priceStr} {c.forWholeGroup}</p>
      {offer.partner_name ? <p style={{ margin: "0 0 4px", color: "#0B3954", fontSize: 14 }}>{c.offerFrom} <strong>{offer.partner_name}</strong> · {c.localProvider}</p> : null}
      {offer.quote_details ? <p style={{ margin: "0 0 20px", color: "#0B3954", fontSize: 15, fontWeight: 600 }}>{offer.quote_details}</p> : <div style={{ marginBottom: 20 }} />}

      <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
        <p style={{ margin: "0 0 6px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.request}</p>
        <div>{categoryLabel(request.category_slug as string, locale)} · {cityLabel(request.city as string, locale)}</div>
        <div>{request.activity_date as string}</div>
        <div>{c.groupLabel(request.adults as number, (request.children as number) ?? 0)}</div>
      </div>

      {incl.length ? (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#0B3954", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 4px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.included}</p>
          {incl.map((x) => <div key={x}>&#10003; {x}</div>)}
        </div>
      ) : null}

      {expired ? (
        <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#FEF9EC", color: "#92400E", fontSize: 15, lineHeight: 1.6 }}>{c.expiredOffer}</p>
      ) : (
        <AcceptButton token={token} inviteId={offer.id} label={c.accept} doneText={c.done} expiredText={c.expiredOffer} />
      )}
    </div>
  );
}

export default async function ActivityOfferPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const c = COPY[locale] ?? COPY.en;

  const found = await requestByClientToken(token);
  if (!found) notFound();
  const { request, quotes } = found;
  const offers = sortQuotesByPrice(quotes);

  // État : déjà accepté
  if (request.status === "accepted") {
    return (
      <main style={shell}>
        <div style={card}>
          <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
          <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>{c.alreadyTitle}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.alreadyBody}</p>
        </div>
      </main>
    );
  }

  // État : décliné par le client
  if (request.status === "declined_by_client") {
    return (
      <main style={shell}>
        <div style={card}>
          <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
          <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>{c.title}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.declineDone}</p>
        </div>
      </main>
    );
  }

  // État : aucune offre disponible encore
  if (offers.length === 0) {
    return (
      <main style={shell}>
        <div style={card}>
          <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>{c.offersTitle}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.noOffers}</p>
        </div>
      </main>
    );
  }

  // État : une ou plusieurs offres à comparer (triées par prix croissant)
  return (
    <main style={shell}>
      <p style={{ margin: "0 0 6px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", textAlign: "center" }}>crete · direct</p>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, color: "#0B3954", fontWeight: 800, textAlign: "center" }}>{c.offersTitle}</h1>
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} token={token} request={request} locale={locale} c={c} />
      ))}
      <DeclineButton token={token} label={c.declineLink} doneText={c.declineDone} />
    </main>
  );
}
