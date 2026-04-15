import { SubmitEventClient } from "./SubmitEventClient";
import { buildAlternates } from "@/lib/seo";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Submit an Event in Crete - Community Listings | Crete Direct", desc: "Know about a festival, market, concert or village celebration in Crete? Submit it to Crete Direct. All events are reviewed before publishing." },
  fr: { title: "Soumettre un Événement en Crète - Annonces Communautaires | Crete Direct", desc: "Vous connaissez un festival, marché, concert ou célébration en Crète ? Soumettez-le à Crete Direct. Tous les événements sont examinés avant publication." },
  de: { title: "Event in Kreta einreichen - Community-Angebote | Crete Direct", desc: "Kennen Sie ein Festival, einen Markt, ein Konzert oder eine Feier auf Kreta? Reichen Sie es bei Crete Direct ein. Alle Events werden vor Veröffentlichung geprüft." },
  el: { title: "Υποβολή Εκδήλωσης στην Κρήτη - Κοινοτικές Αγγελίες | Crete Direct", desc: "Γνωρίζετε κάποιο φεστιβάλ, αγορά, συναυλία ή πανηγύρι στην Κρήτη; Υποβάλετέ το στο Crete Direct." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/submit-event`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/submit-event"),
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

export default function SubmitEventPage() {
  return <SubmitEventClient />;
}
