import { setRequestLocale } from "next-intl/server";
import { CiBus } from "@/components/icons";

// Page "fake-door" : l'achat de billets n'existe pas encore. Elle sert à MESURER
// l'intention d'achat (clic CTA "Acheter un ticket" depuis un itinéraire +
// pageview Plausible). Volontairement noindex (pas un contenu, un test produit).
// Dynamique : lit from/to en query (pas de pré-rendu).

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

const T: Record<string, { title: string; body: string; noted: string; ticket: string; back: string }> = {
  en: {
    title: "Online tickets — coming soon",
    body: "Buying bus tickets online isn't available yet on crete.direct.",
    noted: "We've noted your interest in this route — it helps us decide whether to build it.",
    ticket: "Ticket",
    back: "Back to your route",
  },
  fr: {
    title: "Billets en ligne — bientôt",
    body: "L'achat de billets de bus en ligne n'est pas encore disponible sur crete.direct.",
    noted: "On a noté votre intérêt pour ce trajet — ça nous aide à décider de la construire.",
    ticket: "Billet",
    back: "Revenir à votre itinéraire",
  },
  de: {
    title: "Online-Tickets — bald",
    body: "Der Online-Kauf von Bustickets ist auf crete.direct noch nicht verfügbar.",
    noted: "Wir haben Ihr Interesse an dieser Strecke notiert — das hilft uns bei der Entscheidung.",
    ticket: "Ticket",
    back: "Zurück zu Ihrer Route",
  },
  el: {
    title: "Εισιτήρια online — σύντομα",
    body: "Η αγορά εισιτηρίων online δεν είναι ακόμη διαθέσιμη στο crete.direct.",
    noted: "Σημειώσαμε το ενδιαφέρον σας για αυτή τη διαδρομή — μας βοηθά να αποφασίσουμε.",
    ticket: "Εισιτήριο",
    back: "Επιστροφή στη διαδρομή σας",
  },
};

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { from, to } = await searchParams;
  const t = T[locale] || T.en;

  const routeLabel = from && to ? `${t.ticket} : ${from} · ${to}` : null;
  const backHref =
    from && to
      ? `/${locale}/buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      : `/${locale}/buses`;

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-[28px] bg-white p-8 text-center shadow-[0_12px_32px_rgba(11,94,120,.10)]">
        <div className="mx-auto mb-4 inline-flex p-4 rounded-2xl bg-sun/20">
          <CiBus className="w-8 h-8 text-night" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-text mb-2">{t.title}</h1>
        {routeLabel && (
          <p className="text-sm font-semibold text-lagoon-deep mb-3">{routeLabel}</p>
        )}
        <p className="text-text-muted text-sm mb-2">{t.body}</p>
        <p className="text-text-muted text-sm mb-6">{t.noted}</p>
        <a
          href={backHref}
          className="inline-block rounded-full bg-night text-white font-bold text-sm px-6 py-3 hover:bg-night/90 transition-colors"
        >
          {t.back}
        </a>
      </div>
    </main>
  );
}
