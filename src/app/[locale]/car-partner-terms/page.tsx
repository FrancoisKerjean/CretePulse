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
// ⛔ Le contenu ne promet QUE ce qui existe aujourd hui. Le tunnel de paiement
// en ligne est ecrit mais desarme (CAR_BOOKING_ENABLED absent) : la clause 4 dit
// donc l etat actuel, et annonce que tout changement arrivera par ecrit AVANT,
// jamais decouvert sur une reservation. C est exactement l engagement pris a
// Zorbas le 30/07.
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const revalidate = 86400;

const CONTACT = "kami@crete.direct";

interface Clause {
  title: string;
  body: string;
}

const TERMS: Clause[] = [
  {
    title: "Requests, not subscriptions",
    body: "A traveller describes the car they need: pick-up point, dates and times, category, number of passengers. Every partner covering that area receives the same request at the same time. You send your price in one click, or you pass. No subscription, no listing fee, no exclusivity, no dashboard to log into, and no penalty for passing on a request.",
  },
  {
    title: "The traveller's contact details reach you only when they choose you",
    body: "Until the traveller accepts your quote, you receive the booking details but never their name, email or phone number. This protects you as much as us: no partner can be approached behind another's back, and every quote is judged on the car and the price alone. The moment the traveller accepts, we introduce you both by email and step out of the conversation.",
  },
  {
    title: "The price you send is firm for those dates",
    body: "Your quote is an all-inclusive total for the exact dates and times of the request, in euros, VAT included. We show the traveller what it works out to per day, and your quoted price is what they expect to pay at the counter. If a request is ambiguous, ask us before quoting: a price corrected after the traveller has seen it costs both of us more than a question.",
  },
  {
    title: "The traveller pays you directly",
    body: "Today there is no online prepayment on crete.direct: the traveller pays you at pick-up, by your usual means, and you collect 100% of the rental. We never hold your money. If that ever changes, the new rules will be sent to you in writing before they apply, never discovered on a booking.",
  },
  {
    title: "Commission: 10% of the rental, only on rentals that actually happen",
    body: "Our fee is 10% of the quoted rental price, due only when the rental takes place. A cancelled booking, a no-show, or a request you passed on generates nothing. We invoice you once the rental has started; the invoice is payable on receipt by bank transfer or card. If a booking is cancelled after we have invoiced, tell us and we issue a credit note.",
  },
  {
    title: "The invoice is intra-EU, so we need your VAT number",
    body: "We are a French company invoicing a Greek business, so the commission is an intra-EU supply of services under the reverse charge: no VAT is charged, and you account for it yourself. The invoice is only valid if it carries your VAT number, alongside your legal name and registered address. That is why we ask for those four items once, and why no invoice can be issued before we have them. They also feed the monthly EU recapitulative statement we are required to file.",
  },
  {
    title: "Cancellations: your policy applies, ours does not exist",
    body: "We do not sell, hold or cancel anything. Tell us your cancellation and no-show conditions once, in a line or two, and we show them to travellers before they choose you. Any booking cancelled by either side must be reported to us, and no commission is due on it.",
  },
  {
    title: "No exclusivity, leave whenever you want",
    body: "Either side can end this by a single email, with no notice and no penalty. Requests already accepted are honoured, and commission already due on completed rentals remains payable. Your coverage area is yours to define, and to change at any time: tell us and we stop sending requests outside it.",
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
      "How the crete.direct car rental partnership works: you quote or pass, the traveller pays you directly, 10% commission only on rentals that actually happen.",
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
            crete.direct · Car rental partner terms · v1, August 2026
          </p>
          <h1 className="mb-4 mt-2 text-3xl font-bold text-sea">How the partnership works</h1>
          <p className="max-w-2xl text-text">
            crete.direct sends car rental requests from travellers to local agencies in Crete, and
            introduces the two sides once the traveller has chosen a quote. Eight points, and
            nothing hidden behind them.
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
            These terms apply to requests sent from the date above. Any change is sent to active
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
