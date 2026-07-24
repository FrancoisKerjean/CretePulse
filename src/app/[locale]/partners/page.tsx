// Page de vente B2B du slot "partenaire taxi" : grille des zones exclusives,
// prix, Stripe Payment Link, pitch honnete (zero garantie inventee).
// Spec : docs/superpowers/specs/2026-06-10-taxi-partners-design.md
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, BarChart3, Tag, MailOpen } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import { PARTNER_PRICE_EUR, type TaxiPartnersData } from "@/lib/taxi-partners";
import partnersData from "@/data/taxi-partners.json";
import type { Locale } from "@/lib/types";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SUPPORTED: Locale[] = ["en", "fr", "de", "el"];
const STRIPE_URL = process.env.NEXT_PUBLIC_PARTNERS_STRIPE_URL || "";
const CONTACT = "contact@kairosguest.com";

function pickUiLoc(l: string): Locale {
  return (SUPPORTED as string[]).includes(l) ? (l as Locale) : "en";
}

const T = {
  title: {
    en: "Taxi partners · your company on the busiest bus pages in Crete",
    fr: "Partenaires taxi · votre compagnie sur les pages bus les plus consultées de Crète",
    de: "Taxi-Partner · Ihr Unternehmen auf den meistbesuchten Busseiten Kretas",
    el: "Συνεργάτες ταξί · η εταιρεία σας στις πιο δημοφιλείς σελίδες λεωφορείων της Κρήτης",
  },
  metaDesc: {
    en: "One exclusive taxi partner per zone on crete.direct bus pages. Clearly labelled, monthly traffic report, cancel anytime.",
    fr: "Un partenaire taxi exclusif par zone sur les pages bus de crete.direct. Étiqueté sponsorisé, rapport mensuel, résiliable à tout moment.",
    de: "Ein exklusiver Taxi-Partner pro Zone auf den Busseiten von crete.direct. Klar gekennzeichnet, monatlicher Bericht, jederzeit kündbar.",
    el: "Ένας αποκλειστικός συνεργάτης ταξί ανά ζώνη στις σελίδες λεωφορείων του crete.direct. Με σήμανση, μηνιαία αναφορά, ακύρωση οποτεδήποτε.",
  },
  pitch: {
    en: "Around 3 out of 4 visits to crete.direct land on our live KTEL bus pages, in 7+ languages. Travellers compare the bus with a taxi right there. One taxi company per zone gets that spot · clearly labelled as sponsored.",
    fr: "Environ 3 visites sur 4 de crete.direct arrivent sur nos pages bus KTEL en direct, en 7+ langues. Les voyageurs y comparent le bus et le taxi. Une seule compagnie de taxi par zone obtient cet emplacement · clairement étiqueté sponsorisé.",
    de: "Rund 3 von 4 Besuchen auf crete.direct landen auf unseren Live-KTEL-Busseiten in 7+ Sprachen. Reisende vergleichen dort Bus und Taxi. Ein Taxiunternehmen pro Zone erhält diesen Platz · klar als gesponsert gekennzeichnet.",
    el: "Περίπου 3 στις 4 επισκέψεις στο crete.direct καταλήγουν στις σελίδες λεωφορείων ΚΤΕΛ, σε 7+ γλώσσες. Οι ταξιδιώτες συγκρίνουν εκεί λεωφορείο και ταξί. Μία εταιρεία ταξί ανά ζώνη παίρνει αυτή τη θέση · με σαφή σήμανση χορηγίας.",
  },
  includes: {
    en: ["Exclusive: one partner per zone", "Your name + phone on every bus page of your zone", "Monthly Plausible report: calls and page views", "No meeting, no contract · email and Stripe, cancel anytime"],
    fr: ["Exclusif : un partenaire par zone", "Votre nom + téléphone sur chaque page bus de votre zone", "Rapport Plausible mensuel : appels et pages vues", "Sans rendez-vous, sans engagement · email et Stripe, résiliable à tout moment"],
    de: ["Exklusiv: ein Partner pro Zone", "Ihr Name + Telefon auf jeder Busseite Ihrer Zone", "Monatlicher Plausible-Bericht: Anrufe und Seitenaufrufe", "Kein Termin, kein Vertrag · E-Mail und Stripe, jederzeit kündbar"],
    el: ["Αποκλειστικότητα: ένας συνεργάτης ανά ζώνη", "Όνομα + τηλέφωνο σε κάθε σελίδα λεωφορείων της ζώνης σας", "Μηνιαία αναφορά Plausible: κλήσεις και προβολές", "Χωρίς ραντεβού, χωρίς δέσμευση · email και Stripe, ακύρωση οποτεδήποτε"],
  },
  price: {
    en: (p: number) => `${p} €/month per zone`,
    fr: (p: number) => `${p} €/mois par zone`,
    de: (p: number) => `${p} €/Monat pro Zone`,
    el: (p: number) => `${p} €/μήνα ανά ζώνη`,
  },
  zones: { en: "Zones", fr: "Zones", de: "Zonen", el: "Ζώνες" },
  available: { en: "Available", fr: "Disponible", de: "Verfügbar", el: "Διαθέσιμη" },
  taken: { en: "Taken", fr: "Prise", de: "Vergeben", el: "Κατειλημμένη" },
  cta: { en: "Become the partner of your zone", fr: "Devenez le partenaire de votre zone", de: "Werden Sie Partner Ihrer Zone", el: "Γίνετε ο συνεργάτης της ζώνης σας" },
  ctaEmail: {
    en: "Questions? Write to us:", fr: "Des questions ? Écrivez-nous :",
    de: "Fragen? Schreiben Sie uns:", el: "Ερωτήσεις; Γράψτε μας:",
  },
  howTitle: { en: "How it works", fr: "Comment ça marche", de: "So funktioniert es", el: "Πώς λειτουργεί" },
  how: {
    en: ["Pay via Stripe and name your zone · first come, first served (we refund if the zone is taken).", "We add your company to every bus page of the zone within 48 h.", "Every month you receive the Plausible numbers: taxi-block calls and page views. Honest data, nothing else."],
    fr: ["Payez via Stripe en indiquant votre zone · premier arrivé, premier servi (remboursement si la zone est prise).", "Nous ajoutons votre compagnie sur chaque page bus de la zone sous 48 h.", "Chaque mois vous recevez les chiffres Plausible : appels du bloc taxi et pages vues. Des données honnêtes, rien d'autre."],
    de: ["Per Stripe zahlen und Ihre Zone angeben · wer zuerst kommt (Erstattung, falls vergeben).", "Wir fügen Ihr Unternehmen innerhalb von 48 h auf jeder Busseite der Zone hinzu.", "Jeden Monat erhalten Sie die Plausible-Zahlen: Anrufe und Seitenaufrufe. Ehrliche Daten, sonst nichts."],
    el: ["Πληρώστε μέσω Stripe δηλώνοντας τη ζώνη σας · σειρά προτεραιότητας (επιστροφή αν είναι κατειλημμένη).", "Προσθέτουμε την εταιρεία σας σε κάθε σελίδα λεωφορείων της ζώνης εντός 48 ωρών.", "Κάθε μήνα λαμβάνετε τα νούμερα του Plausible: κλήσεις και προβολές. Τίμια δεδομένα, τίποτα άλλο."],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  return {
    title: `${T.title[ui]} | Crete Direct`,
    description: T.metaDesc[ui],
    alternates: buildAlternates(locale, "/partners"),
    openGraph: { title: T.title[ui], description: T.metaDesc[ui], url: `${BASE_URL}/${locale}/partners`, type: "website" },
  };
}

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  const data = partnersData as TaxiPartnersData;
  const takenZones = new Set(data.partners.map((p) => p.zoneId));

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-sea mb-4">{T.title[ui]}</h1>
        <p className="text-text mb-8">{T.pitch[ui]}</p>

        <ul className="space-y-2 mb-8 list-none p-0">
          {T.includes[ui].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text">
              <CheckCircle2 className="w-4 h-4 text-sea shrink-0 mt-0.5" /> {item}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-sea/30 bg-white p-5 mb-8">
          <p className="text-2xl font-bold text-sea mb-3">{T.price[ui](PARTNER_PRICE_EUR)}</p>
          {STRIPE_URL ? (
            <a href={STRIPE_URL} target="_blank" rel="noopener"
               className="inline-flex items-center gap-2 rounded-lg bg-sea text-white font-semibold px-5 py-2.5 hover:opacity-90">
              <Tag className="w-4 h-4" /> {T.cta[ui]}
            </a>
          ) : null}
          <p className="text-sm text-text-muted mt-3 mb-0 flex items-center gap-1.5">
            <MailOpen className="w-4 h-4" /> {T.ctaEmail[ui]}{" "}
            <a href={`mailto:${CONTACT}`} className="text-sea hover:underline">{CONTACT}</a>
          </p>
        </div>

        <h2 className="text-xl font-semibold text-text mb-3">{T.zones[ui]}</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {data.zones.map((z) => (
            <div key={z.id} className="rounded-xl border border-border bg-white p-4 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-text">{z.label}</span>
              {takenZones.has(z.id) ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">{T.taken[ui]}</span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">{T.available[ui]}</span>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-text mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sea" /> {T.howTitle[ui]}
        </h2>
        <ol className="space-y-2 mb-4 pl-5">
          {T.how[ui].map((item, i) => (
            <li key={i} className="text-sm text-text">{item}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}
