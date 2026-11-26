// Conditions de la mise en relation voiture, cote LOUEUR. Le document que les
// loueurs reclamaient : Zorbas a explicitement conditionne l envoi de ses
// coordonnees societe a « an agreement between us » (01/08/2026), et le courrier
// de facturation en promet un. Jusqu ici les deux URL candidates rendaient 404.
//
// ⛔ ANGLAIS SEUL, et `noindex`, deliberement :
// - c est une piece B2B adressee a des loueurs cretois, qui traitent tous avec
//   nous en anglais. La traduire en 22 langues creerait 22 URL indexables
//   pendant une chute Google deja attribuee au volume declare au sitemap ;
// - elle n est PAS ajoutee a STATIC_PAGES (src/app/sitemap.xml/route.ts) : la
//   liste y est explicite, une page nouvelle n y entre pas toute seule ;
// - une seule URL se communique aux loueurs : /en/car-partner-terms.
//
// ⛔ Version 2027-01 : modele grille publiee + acompte en ligne garde comme
// commission. La page est publique quel que soit l interrupteur du tunnel, et
// lue AVANT sa mise en service : la phrase d en-tete dit que les conditions ne
// s appliquent qu a partir de l acceptation sur la page privee du loueur.
// La version affichee vient de CAR_TERMS_VERSION (src/lib/car-catalogue.ts).
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CAR_TERMS_VERSION } from "@/lib/car-catalogue";

export const revalidate = 86400;

const CONTACT = "kami@crete.direct";

interface Clause {
  title: string;
  body: string;
}

const TERMS: Clause[] = [
  {
    title: "Requests, price grids and quotes",
    body: "A traveller describes the car they need: pick-up point, dates and times, category, number of passengers. If you have published a price grid, your price for those dates is shown to the traveller straight away. If not, you receive the request and send a quote in one click, or you pass. No subscription, no listing fee, no exclusivity, and no penalty for passing on a request.",
  },
  {
    title: "The traveller's contact details reach you only once you confirm",
    body: "Until you confirm a booking, you receive its details but never the traveller's name, email or phone number, and the traveller never receives yours. This protects you as much as us: no partner can be approached behind another's back. When you confirm, we send each side the other's contact details, and we step out of the conversation.",
  },
  {
    title: "Your published prices are binding",
    body: "A published price is an all-inclusive total in euros, VAT included, for the dates and times of the booking. It binds you for every booking you confirm. The same applies to a quote you send by hand: the price is firm for those dates. Change your grid whenever you want: a change applies to new bookings only.",
  },
  {
    title: "The online deposit: our mandate to collect it",
    body: "The traveller pays an advance online when booking, called the deposit in these terms. It equals your commission rate (10% of the rental price unless agreed otherwise in writing). You give crete.direct a mandate to collect this deposit in your name and to keep it as payment of our commission. We hold nothing else of yours. If we refund the traveller, the deposit is not kept and no commission is due.",
  },
  {
    title: "Commission: only on rentals that take place, or that are cancelled late",
    body: "Our commission is your commission rate applied to the confirmed rental price (10% unless agreed otherwise in writing). It is due when the rental takes place, or when the traveller cancels late or does not show up (see point 8). We invoice you on the first day of the rental. The invoice is settled by offset against the deposit we already collected, so you pay nothing more. A booking that is declined, released or cancelled in time generates nothing.",
  },
  {
    title: "The invoice is intra-EU, so we need your VAT number",
    body: "We are a French company invoicing a Greek business, so the commission is an intra-EU supply of services under the reverse charge: no VAT is charged, and you account for it yourself. The invoice is only valid if it carries your VAT number, alongside your legal name and registered address. That is why we ask for those four items once, and why no invoice can be issued before we have them. They also feed the monthly EU recapitulative statement we are required to file.",
  },
  {
    title: "Confirm or decline within 4 opening hours",
    body: "When a traveller pays the deposit, you receive an email with the dates, pick-up point, category, total price and the amount to collect at the counter, with two buttons: Confirm and Not available. You have 4 opening hours to answer. Opening hours are 08:00 to 22:00, Athens time, counted from the payment. Example: a payment at 10:00 is due at 14:00 the same day, a payment at 21:30 is due at 11:30 the next day. With no answer, the booking is released and the traveller is refunded in full.",
  },
  {
    title: "If the traveller cancels",
    body: "Free up to 48 hours before pick-up: the deposit is refunded in full and no commission is due. Later than that, or if the traveller does not show up: we keep the deposit as commission and invoice it to you like a completed rental. We tell you when a traveller cancels.",
  },
  {
    title: "If you cancel, or have no car at the counter",
    body: "If you decline, let the deadline pass, cancel after confirming, or have no car at the counter, the traveller is refunded in full. If the commission invoice was already issued, we issue a credit note. Three such failures within 30 days (declined, timed out or cancelled after confirmation) suspend your published prices until we have spoken.",
  },
  {
    title: "At the counter",
    body: "You collect the rest of the rental price at the counter: the confirmed price minus the deposit (90% with a 10% deposit). You charge nothing other than the options the traveller chooses on site. Charging more than the confirmed price at the counter means exclusion from crete.direct. If the rental ends up shorter or longer, our commission does not change: it is based on the confirmed price.",
  },
  {
    title: "No exclusivity, leave whenever you want",
    body: "Either side can end this by a single email, with no notice and no penalty. Bookings already confirmed are honoured, and commission already due remains payable. Your coverage area is yours to define, and to change at any time: tell us and we stop sending requests outside it.",
  },
];

// ⛔ `noindex, nofollow` : document contractuel, pas une page de contenu. Meme
// posture que la page de facture (invoice/[token]). Un seul export de metadonnees
// est admis par Next : tout passe par generateMetadata, jamais aussi par `metadata`.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Car rental partner terms · crete.direct",
    description:
      "How the crete.direct car rental partnership works: published prices, an online deposit kept as commission, confirmation within 4 opening hours, the rest paid at the counter.",
    robots: { index: false, follow: false },
    alternates: { canonical: `https://crete.direct/${locale}/car-partner-terms` },
  };
}

export default async function CarPartnerTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-surface">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-sea">
            crete.direct · Car rental partner terms · {`Version ${CAR_TERMS_VERSION}`}
          </p>
          <h1 className="mb-4 mt-2 text-3xl font-bold text-sea">How the partnership works</h1>
          <p className="max-w-2xl text-text">
            crete.direct sends car rental requests from travellers to local agencies in Crete, and
            introduces the two sides once the booking is confirmed. {TERMS.length} points, and
            nothing hidden behind them.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-text">
            These terms apply to bookings made through crete.direct from the date you accept them
            on your partner page.
          </p>
        </header>

        <ol className="list-none space-y-4 p-0">
          {TERMS.map((t, i) => (
            <li key={t.title} className="rounded-xl border border-border bg-white p-5">
              <h2 className="flex items-baseline gap-3 text-lg font-bold text-text">
                <span className="text-sea">{i + 1}.</span>
                {t.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text">{t.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-8 rounded-xl border border-sea/30 bg-white p-5">
          <h2 className="mb-3 text-xl font-semibold text-text">
            What we need from you, once
          </h2>
          {/* ⛔ Puces obligatoires ici, vu a l oeil avant push : plusieurs items
              passent sur deux lignes en mobile, et sans marqueur la liste se
              lisait comme un pave ou l on ne voit plus ou finit un item. C est
              precisement la liste que le loueur doit recopier. */}
          <ul className="list-none space-y-1.5 p-0 text-sm text-text">
            {[
              "Registered company name, exactly as it appears on your own invoices",
              "Legal form (IKE, OE, AE, sole trader...)",
              "Registered address, with postal code and city",
              "VAT number, in the EL999999999 format",
              "The areas you actually serve, and your minimum rental duration if you have one",
              "Your cancellation policy, in one or two lines",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-sea" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-3 text-sm text-text-muted">
            Send them to{" "}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-sea hover:underline">
              {CONTACT}
            </a>{" "}
            and we confirm in writing that your file is complete.
          </p>
        </section>

        <footer className="mt-10 text-xs leading-relaxed text-text-muted">
          <p>
            crete.direct is a trading name operated by NovAI SAS, a French simplified joint-stock
            company, RCS Brest 994 765 857, registered office 15 Rue Berthollet, 29200 Brest,
            France. Commission invoices are issued by NovAI SAS.
          </p>
          <p className="mt-2">
            Any change is sent to active
            partners by email before it takes effect. Questions:{" "}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-sea hover:underline">
              {CONTACT}
            </a>
          </p>
        </footer>
      </article>
    </main>
  );
}
