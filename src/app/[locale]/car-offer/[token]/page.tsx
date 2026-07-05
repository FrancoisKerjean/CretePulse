import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { hashToken } from "@/lib/car-quote";
import { AcceptButton } from "./AcceptButton";
import { inclusionLabels } from "@/lib/car-inclusions";
import { isOfferExpired } from "@/lib/car-offer-expiry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

const money = (p: number, c: string) => (c === "EUR" ? `€${p}` : `${p} ${c}`);

type Copy = {
  title: string; intro: string; request: string; accept: string; done: string;
  expired: string; expiredOffer: string; alreadyTitle: string; alreadyBody: string;
  offerFrom: string; localAgency: string; included: string; perDay: string; total: string;
  reassure: string[]; steps: string[];
};

const COPY: Record<string, Copy> = {
  en: {
    title: "Your car rental quote", intro: "Here is the price for your request. Accept it and we connect you directly with the rental agency.", request: "Your request", accept: "Accept this offer", done: "Accepted! The rental agency now has your details and will contact you. Check your inbox for their contact info.", expired: "This offer link is no longer valid.", expiredOffer: "This offer has expired. Send a new request and local agencies will quote you again.", alreadyTitle: "Already accepted", alreadyBody: "You already accepted this offer. The rental agency will contact you, and their details are in your inbox.",
    offerFrom: "Offer from", localAgency: "local rental agency in Crete",
    included: "Included in the price", perDay: "per day", total: "total",
    reassure: ["No online prepayment — no card needed to book", "You pay the agency on pickup — cash accepted", "A real local agency in Crete, direct contact"],
    steps: ["You accept this offer", "We share your details with the agency", "The agency contacts you to finalise — payment on pickup"],
  },
  fr: {
    title: "Votre devis de location", intro: "Voici le prix pour votre demande. Acceptez-le et nous vous mettons directement en relation avec l'agence de location.", request: "Votre demande", accept: "Accepter cette offre", done: "Accepté ! L'agence de location a maintenant vos coordonnées et va vous contacter. Ses coordonnées sont dans votre boîte mail.", expired: "Ce lien d'offre n'est plus valide.", expiredOffer: "Cette offre a expiré. Refaites une demande et les agences locales vous proposeront un nouveau prix.", alreadyTitle: "Déjà accepté", alreadyBody: "Vous avez déjà accepté cette offre. L'agence va vous contacter, ses coordonnées sont dans votre boîte mail.",
    offerFrom: "Offre de", localAgency: "agence de location locale en Crète",
    included: "Inclus dans le prix", perDay: "par jour", total: "au total",
    reassure: ["Aucun prépaiement en ligne — pas de carte pour réserver", "Vous payez l'agence au retrait — espèces acceptées", "Une vraie agence locale en Crète, en direct"],
    steps: ["Vous acceptez cette offre", "On transmet vos coordonnées à l'agence", "L'agence vous contacte pour finaliser — paiement au retrait"],
  },
  de: {
    title: "Ihr Mietwagen-Angebot", intro: "Hier ist der Preis für Ihre Anfrage. Nehmen Sie an und wir verbinden Sie direkt mit der Autovermietung.", request: "Ihre Anfrage", accept: "Angebot annehmen", done: "Angenommen! Die Autovermietung hat nun Ihre Daten und wird Sie kontaktieren. Ihre Kontaktdaten finden Sie in Ihrem Postfach.", expired: "Dieser Angebotslink ist nicht mehr gültig.", expiredOffer: "Dieses Angebot ist abgelaufen. Stellen Sie eine neue Anfrage und lokale Agenturen machen Ihnen wieder ein Angebot.", alreadyTitle: "Bereits angenommen", alreadyBody: "Sie haben dieses Angebot bereits angenommen. Die Vermietung wird Sie kontaktieren, ihre Daten sind in Ihrem Postfach.",
    offerFrom: "Angebot von", localAgency: "lokale Autovermietung auf Kreta",
    included: "Im Preis enthalten", perDay: "pro Tag", total: "gesamt",
    reassure: ["Keine Online-Vorauszahlung — keine Karte zum Buchen erforderlich", "Sie zahlen bei der Abholung — Barzahlung möglich", "Eine echte lokale Autovermietung auf Kreta, direkt"],
    steps: ["Sie nehmen dieses Angebot an", "Wir übermitteln Ihre Daten an die Vermietung", "Die Vermietung kontaktiert Sie zur Bestätigung — Zahlung bei Abholung"],
  },
  el: {
    title: "Η προσφορά ενοικίασης", intro: "Ορίστε η τιμή για το αίτημά σας. Αποδεχτείτε την και σας συνδέουμε απευθείας με το γραφείο ενοικίασης.", request: "Το αίτημά σας", accept: "Αποδοχή προσφοράς", done: "Έγινε αποδοχή! Το γραφείο ενοικίασης έχει τα στοιχεία σας και θα επικοινωνήσει μαζί σας. Τα στοιχεία του είναι στο email σας.", expired: "Αυτός ο σύνδεσμος προσφοράς δεν ισχύει πλέον.", expiredOffer: "Αυτή η προσφορά έχει λήξει. Στείλτε νέο αίτημα και οι τοπικές εταιρείες θα σας προτείνουν νέα τιμή.", alreadyTitle: "Έχει ήδη γίνει αποδοχή", alreadyBody: "Έχετε ήδη αποδεχτεί αυτή την προσφορά. Το γραφείο θα επικοινωνήσει μαζί σας, τα στοιχεία του είναι στο email σας.",
    offerFrom: "Προσφορά από", localAgency: "τοπικό γραφείο ενοικίασης στην Κρήτη",
    included: "Περιλαμβάνεται στην τιμή", perDay: "ανά ημέρα", total: "συνολικά",
    reassure: ["Χωρίς προπληρωμή στο διαδίκτυο — δεν χρειάζεται κάρτα για κράτηση", "Πληρώνετε το γραφείο κατά την παραλαβή — γίνονται δεκτά μετρητά", "Αληθινό τοπικό γραφείο ενοικίασης στην Κρήτη, σε απευθείας επαφή"],
    steps: ["Αποδέχεστε αυτήν την προσφορά", "Μεταβιβάζουμε τα στοιχεία σας στο γραφείο", "Το γραφείο επικοινωνεί μαζί σας για να οριστικοποιήσει — πληρωμή κατά την παραλαβή"],
  },
};

export default async function CarOfferPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const c = COPY[locale] ?? COPY.en;

  const { data: row } = await supabase.from("car_requests")
    .select("id, status, pickup_slug, date_from, date_to, car_type, quoted_price, quoted_currency, quoted_at, partner_name, quoted_car_model, quoted_inclusions")
    .eq("accept_token_hash", hashToken(token))
    .maybeSingle();

  if (!row || row.quoted_price == null) {
    return (
      <main style={shell}>
        <div style={card}>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>{c.title}</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.expired}</p>
        </div>
      </main>
    );
  }

  const ct = CAR_TYPES_DATA.find((cc) => cc.id === row.car_type);
  const carTypeLabel = ct?.labels[locale] ?? ct?.labels.en ?? row.car_type;
  const priceStr = money(row.quoted_price, row.quoted_currency || "EUR");
  const incl = inclusionLabels(row.quoted_inclusions as string[] | null, locale);
  const days = Math.max(1, Math.round((new Date(row.date_to).getTime() - new Date(row.date_from).getTime()) / 86400000));
  const perDay = money(Math.round(row.quoted_price / days), row.quoted_currency || "EUR");

  return (
    <main style={shell}>
      <div style={card}>
        <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>

        {row.status === "accepted" ? (
          <>
            <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>{c.alreadyTitle}</h1>
            <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.alreadyBody}</p>
          </>
        ) : isOfferExpired(row.quoted_at, row.date_from, Date.now()) ? (
          <>
            <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>{c.title}</h1>
            <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>{c.expiredOffer}</p>
          </>
        ) : (
          <>
            <h1 style={{ margin: "0 0 6px", fontSize: 30, color: "#0B3954", fontWeight: 800 }}>{priceStr}</h1>
            <p style={{ margin: "0 0 6px", color: "#5C7886", fontSize: 13 }}>{priceStr} {c.total} · ~{perDay} {c.perDay}</p>
            {row.partner_name ? <p style={{ margin: "0 0 12px", color: "#0B3954", fontSize: 14 }}>{c.offerFrom} <strong>{row.partner_name}</strong> · {c.localAgency}</p> : null}
            <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>{c.intro}</p>

            <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 6px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.request}</p>
              <div>{carPickupLabel(row.pickup_slug)}</div>
              <div>{row.date_from} → {row.date_to}</div>
              <div>{carTypeLabel}</div>
              {row.quoted_car_model ? <div style={{ fontWeight: 700 }}>{row.quoted_car_model}</div> : null}
            </div>

            {incl.length ? (
              <div style={{ marginBottom: 16, fontSize: 14, color: "#0B3954", lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 4px", color: "#94A3B8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.included}</p>
                {incl.map((x) => <div key={x}>✓ {x}</div>)}
              </div>
            ) : null}
            <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
              {c.reassure.map((r) => <p key={r} style={{ margin: "0 0 4px", color: "#0B3954", fontSize: 13 }}>• {r}</p>)}
            </div>
            <ol style={{ margin: "0 0 18px", paddingLeft: 18, color: "#5C7886", fontSize: 13, lineHeight: 1.7 }}>
              {c.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>

            <AcceptButton token={token} label={c.accept} doneText={c.done} expiredText={c.expiredOffer} />
          </>
        )}
      </div>
    </main>
  );
}
