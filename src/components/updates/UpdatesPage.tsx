import Link from "next/link";
import {
  UPDATE_CATEGORY_LABELS,
  UPDATE_STATUS_LABELS,
  sortedProductUpdates,
  updateText,
  type UpdateCategory,
  type UpdateStatus,
} from "@/lib/product-updates";

const CATEGORY_TONE: Record<UpdateCategory, string> = {
  transport: "bg-sea text-white",
  beaches: "bg-lagoon text-night",
  activities: "bg-terracotta text-white",
  car: "bg-night text-white",
  explore: "bg-sun text-night",
  app: "bg-olive text-white",
  data: "bg-sea-faint text-sea",
};

const STATUS_TONE: Record<UpdateStatus, string> = {
  live: "bg-ok/12 text-ok border-ok/20",
  waiting: "bg-warn/18 text-night border-warn/30",
  planned: "bg-white text-text-muted border-border",
};

const COPY = {
  en: {
    eyebrow: "Product log",
    title: "What changed on Crete Direct",
    intro:
      "A running, visitor-friendly log of the practical improvements shipped on the island guide.",
    lead:
      "Only public-facing changes are listed here: new tools, better data, clearer flows and features that help visitors move around Crete.",
    latest: "Latest updates",
    readMore: "Open",
    noLink: "No public page yet",
    liveCount: "live updates",
    waitingCount: "waiting for deploy",
    noteTitle: "How this page is maintained",
    note:
      "Each grouped deployment should add a few clear entries here. Internal migrations, private partner details and technical fixes stay out unless they change the visitor experience.",
    canonicalPath: "/updates",
  },
  fr: {
    eyebrow: "Journal produit",
    title: "Ce qui change sur Crete Direct",
    intro:
      "Un journal continu, lisible par les visiteurs, des améliorations concrètes livrées sur le guide.",
    lead:
      "On liste ici uniquement les nouveautés visibles : nouveaux outils, meilleures données, parcours plus clairs et fonctions qui aident à se déplacer en Crète.",
    latest: "Dernières nouveautés",
    readMore: "Ouvrir",
    noLink: "Pas encore de page publique",
    liveCount: "nouveautés live",
    waitingCount: "en attente de déploiement",
    noteTitle: "Comment cette page est tenue à jour",
    note:
      "À chaque déploiement groupé, on ajoute quelques entrées claires ici. Les migrations internes, détails partenaires privés et correctifs techniques restent hors page sauf s'ils changent l'expérience visiteur.",
    canonicalPath: "/nouveautes",
  },
};

function copy(locale: string) {
  return locale === "fr" ? COPY.fr : COPY.en;
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function UpdatesPage({ locale }: { locale: string }) {
  const t = copy(locale);
  const updates = sortedProductUpdates();
  const liveCount = updates.filter((u) => u.status === "live").length;
  const waitingCount = updates.filter((u) => u.status === "waiting").length;

  return (
    <main className="min-h-screen bg-foam text-text">
      <section className="relative overflow-hidden border-b border-border/80 bg-[linear-gradient(135deg,#F6FBFC_0%,#DFF7FA_48%,#FFF3D6_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[radial-gradient(70%_100%_at_50%_100%,rgba(0,194,212,.18),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-20 md:grid-cols-[1.1fr_.9fr] md:pb-16 md:pt-24">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-sea/20 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sea">
              {t.eyebrow}
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] text-night md:text-7xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted md:text-xl">
              {t.intro}
            </p>
          </div>

          <div className="self-end rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_70px_rgba(11,94,120,.16)] backdrop-blur-xl">
            <p className="text-base leading-7 text-text-muted">{t.lead}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sea px-4 py-4 text-white">
                <p className="font-heading text-4xl font-black">{liveCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/75">
                  {t.liveCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sun px-4 py-4 text-night">
                <p className="font-heading text-4xl font-black">{waitingCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-night/65">
                  {t.waitingCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-black text-night md:text-4xl">{t.latest}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(UPDATE_CATEGORY_LABELS) as UpdateCategory[]).map((category) => (
                <span
                  key={category}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${CATEGORY_TONE[category]}`}
                >
                  {updateText(UPDATE_CATEGORY_LABELS[category], locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute bottom-8 left-[18px] top-2 hidden w-px bg-gradient-to-b from-lagoon via-border to-transparent md:block" />
          <div className="space-y-4">
            {updates.map((update) => {
              const href = update.href ? `/${locale}${update.href}` : null;
              return (
                <article
                  key={update.id}
                  className="group relative rounded-[28px] border border-border bg-white p-5 shadow-[0_12px_34px_rgba(11,94,120,.08)] transition-transform duration-200 hover:-translate-y-0.5 md:ml-12 md:grid md:grid-cols-[170px_1fr_auto] md:gap-6 md:p-6"
                >
                  <div className="absolute -left-[38px] top-8 hidden h-3.5 w-3.5 rounded-full border-4 border-foam bg-lagoon shadow-[0_0_0_5px_rgba(0,194,212,.18)] md:block" />
                  <div className="mb-4 md:mb-0">
                    <time className="font-data text-sm font-bold text-sea">
                      {formatDate(update.date, locale)}
                    </time>
                    <div className="mt-3 flex flex-wrap gap-2 md:block md:space-y-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${CATEGORY_TONE[update.category]}`}>
                        {updateText(UPDATE_CATEGORY_LABELS[update.category], locale)}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_TONE[update.status]}`}>
                        {updateText(UPDATE_STATUS_LABELS[update.status], locale)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black leading-tight text-night">
                      {updateText(update.title, locale)}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-text">
                      {updateText(update.summary, locale)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {updateText(update.detail, locale)}
                    </p>
                    <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-sea">
                      {updateText(update.impact, locale)}
                    </p>
                  </div>

                  <div className="mt-5 flex items-start md:mt-0">
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex rounded-full bg-night px-4 py-2 text-sm font-bold text-white no-underline transition-colors hover:bg-sea"
                      >
                        {t.readMore}
                      </Link>
                    ) : (
                      <span className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-bold text-text-light">
                        {t.noLink}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="mt-10 rounded-[28px] border border-lagoon/25 bg-sea-faint p-6">
          <h2 className="text-xl font-black text-night">{t.noteTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">{t.note}</p>
        </aside>
      </section>
    </main>
  );
}
