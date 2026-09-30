// « L'été 2026 en Crète » : bilan de saison publié le 30/09/2026 (maquette validée).
// Page 100 % statique : textes dans src/lib/crete-2026.ts, séries dans src/data/crete-2026.json,
// aucune requête base, pas de `revalidate` (générée au build pour les 4 locales, zéro écriture ISR).
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates, INDEXABLE_ROBOTS } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import GoatStanding from "@/components/campagne/GoatStanding";
import { ChartFigure, GroupedBarChart, HBarChart, Legend, LineChart, VBarChart } from "@/components/crete-2026/Charts";
import { CopyEmail } from "@/components/crete-2026/CopyEmail";
import s from "@/components/crete-2026/crete-2026.module.css";
import { CRETE_2026_COPY, fmtNum, fmtPct, nb, pickC26, type C26Locale, type Chapter, type Crete2026Copy, type Fact, type PlaceKey } from "@/lib/crete-2026";
import DATA from "@/data/crete-2026.json";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SLUG = "/crete-2026";
const EMAIL = "kami@crete.direct";
const OG_LOCALE: Record<C26Locale, string> = { en: "en_GB", fr: "fr_FR", de: "de_DE", el: "el_GR" };
const ogImage = (l: C26Locale) => `${BASE_URL}/og-crete-2026-${l}.jpg`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = pickC26(locale);
  const { meta } = CRETE_2026_COPY[l];
  const alternates = buildAlternates(locale, SLUG);
  return {
    title: meta.title,
    description: meta.description,
    alternates,
    robots: INDEXABLE_ROBOTS,
    openGraph: {
      siteName: "Crete Direct",
      locale: OG_LOCALE[l],
      type: "article",
      url: alternates.canonical,
      title: meta.title,
      description: meta.description,
      publishedTime: `${DATA.published}T08:00:00+03:00`,
      images: [{ url: ogImage(l), width: 1200, height: 630, alt: meta.headline }],
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: [ogImage(l)] },
  };
}

// ---------- Couleurs des séries (variables du module CSS) ----------
const MAIN = "var(--deep)";
const WARM = "var(--warm)";
const gray = (a: number) => `rgb(var(--gray) / ${a})`;

function FactCard({ f, badge }: { f: Fact; badge: string }) {
  return (
    <li className={`${s.fact} ${f.feat ? s.feat : ""} ${f.grave ? s.grave : ""}`}>
      <div className={s.big}>{nb(f.big)}</div>
      <div className={s.txt}>{nb(f.txt)}</div>
      <div className={s.foot}>
        {f.ex && <span className={s.ex}>{badge}</span>}
        <span>{nb(f.src)}</span>
      </div>
    </li>
  );
}

function Chart({ ch, c, l }: { ch: NonNullable<Chapter["chart"]>; c: Crete2026Copy; l: C26Locale }) {
  const n = (v: number, d = 0) => fmtNum(l, v, d);
  const colon = l === "fr" ? " : " : ": ";
  const fig = (rows: string[][], body: React.ReactNode) => (
    <ChartFigure title={nb(ch.title)} sub={nb(ch.sub)} source={nb(ch.source)} seeData={c.seeData} head={ch.head} rows={rows}>
      {body}
    </ChartFigure>
  );

  if (ch.key === "passengers") {
    const years = DATA.passengers.years;
    const color = (i: number) => (i === years.length - 1 ? MAIN : gray(0.35 + 0.45 * (i / (years.length - 2))));
    const millions = (v: number) => (v === 0 ? "0" : n(v / 1e6, 1) + c.millionSuffix);
    return fig(
      c.months.map((m, i) => [m, ...years.map((y) => (y.values[i] == null ? "" : n(y.values[i] as number)))]),
      <>
        <Legend items={years.map((y, i) => ({ label: String(y.year), color: color(i) }))} />
        <LineChart
          ariaLabel={ch.title}
          height={260}
          padRight={56}
          xLabels={c.months}
          ticks={[0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000]}
          max={3000000}
          fmtY={millions}
          tip={(i) => [c.months[i], ...years.filter((y) => y.values[i] != null).map((y) => `${y.year}${colon}${n(y.values[i] as number)}`)].join("\n") + ` ${c.units.passengers}`}
          series={years.map((y, i) => ({
            label: String(y.year),
            values: y.values,
            color: color(i),
            width: i === years.length - 1 ? 3 : 2,
            ...(i === years.length - 1 ? { endAt: 7, endLabel: n((y.values[7] as number) / 1e6, 2) + c.millionSuffix } : {}),
          }))}
        />
      </>,
    );
  }

  if (ch.key === "languages") {
    const { periods } = DATA.languages;
    const colors = [gray(0.45), "color-mix(in srgb, var(--deep) 60%, transparent)", MAIN];
    return fig(
      c.languages.map((lang, li) => [lang, ...periods.map((p) => fmtPct(l, p.shares[li], 1))]),
      <>
        <Legend items={periods.map((p, i) => ({ label: c.period(p.year), color: colors[i] }))} />
        <GroupedBarChart
          ariaLabel={ch.title}
          height={240}
          groups={c.languages.map((lang, li) => ({ label: lang, values: periods.map((p) => p.shares[li]) }))}
          colors={colors}
          ticks={[0, 20, 40, 60]}
          max={60}
          fmtY={(v) => fmtPct(l, v, 0)}
          fmtV={(v) => fmtPct(l, v, 1)}
          tip={(g, i) => `${c.languages[g]} · ${c.period(periods[i].year)}${colon}${fmtPct(l, periods[i].shares[g], 1)}`}
        />
      </>,
    );
  }

  if (ch.key === "busRoutes") {
    const routes = DATA.busRoutes.routes.map((r) => ({
      label: `${c.places[r.from as PlaceKey]} → ${c.places[r.to as PlaceKey]}`,
      value: r.visitors,
      shown: n(r.visitors),
    }));
    return fig(
      routes.map((r) => [r.label, r.shown]),
      <HBarChart ariaLabel={ch.title} bars={routes} max={routes[0].value} />,
    );
  }

  if (ch.key === "fires") {
    const years = DATA.fires.years;
    const last = years.length - 1;
    const ha = (v: number) => `${n(v)} ${c.units.ha}`;
    return fig(
      years.map((y) => [String(y.year), n(y.hectares)]),
      <VBarChart
        ariaLabel={ch.title}
        height={210}
        ticks={[0, 2000, 4000, 6000, 8000]}
        max={9000}
        fmtY={(v) => n(v)}
        bars={years.map((y, i) => ({
          label: String(y.year),
          value: y.hectares,
          color: i === last ? WARM : gray(0.5),
          shown: i === 0 || i === last ? ha(y.hectares) : undefined,
          tip: `${y.year}${colon}${ha(y.hectares)}`,
        }))}
      />,
    );
  }

  // index : visites et recettes réelles, base 100 en 2016
  const years = DATA.index.years;
  const last = years.length - 1;
  return fig(
    years.map((y) => [String(y.year), n(y.visits, 1), n(y.receipts, 1)]),
    <>
      <Legend items={[{ label: c.series.visits, color: MAIN }, { label: c.series.receipts, color: WARM }]} />
      <LineChart
        ariaLabel={ch.title}
        height={250}
        padRight={44}
        xLabels={years.map((y) => String(y.year))}
        ticks={[0, 40, 80, 120, 160]}
        max={160}
        fmtY={(v) => n(v)}
        tip={(i) => `${years[i].year}\n${c.series.visits}${colon}${n(years[i].visits, 1)}\n${c.series.receipts}${colon}${n(years[i].receipts, 1)}`}
        series={[
          { label: c.series.visits, values: years.map((y) => y.visits), color: MAIN, endAt: last, endLabel: n(years[last].visits) },
          { label: c.series.receipts, values: years.map((y) => y.receipts), color: WARM, endAt: last, endLabel: n(years[last].receipts) },
        ]}
      />
    </>,
  );
}

export default async function Crete2026Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = pickC26(locale);
  const c = CRETE_2026_COPY[l];
  const url = `${BASE_URL}/${locale}${SLUG}`;
  const publisher = { "@type": "Organization", name: "Crete Direct", url: BASE_URL, logo: { "@type": "ImageObject", url: `${BASE_URL}/icon.svg` } };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: c.meta.headline,
      description: c.meta.description,
      inLanguage: locale,
      datePublished: DATA.published,
      dateModified: DATA.published,
      image: { "@type": "ImageObject", url: ogImage(l), width: 1200, height: 630 },
      author: { "@type": "Organization", name: "Crete Direct", url: BASE_URL },
      publisher,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      about: { "@type": "Place", name: "Crete, Greece" },
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: c.meta.datasetName,
      description: c.meta.datasetDescription,
      url,
      inLanguage: locale,
      datePublished: DATA.published,
      isAccessibleForFree: true,
      creator: publisher,
      temporalCoverage: "2016/2026",
      spatialCoverage: { "@type": "Place", name: "Crete, Greece" },
      variableMeasured: c.meta.variables,
    },
  ];

  const nav = [...c.chapters.map((ch) => [ch.id, ch.nav]), [c.method.id, c.method.nav]];

  return (
    <main className={s.page}>
      <JsonLd data={jsonLd} />

      <header className={s.scene}>
        <div className={s.sun} aria-hidden />
        <div className={s.hero}>
          <div>
            <p className={s.kicker}>{c.hero.kicker}</p>
            <h1 className={s.h1}>
              {c.hero.h1Line}
              <br />
              {c.hero.h1Pre}
              <span className={s.hl}>{c.hero.h1Hl}</span>
            </h1>
            <p className={s.lede}>{c.hero.lede}</p>
          </div>
          <div className={s.goat} role="img" aria-label={c.hero.goat}>
            <GoatStanding />
          </div>
        </div>
        <svg className={s.wave} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0 46 q180 -34 360 -4 q204 36 432 2 q216 -32 408 0 V80 H0 Z" style={{ fill: "#009fb0" }} opacity=".55" />
          <path d="M0 58 q204 -22 408 0 q216 22 444 0 q192 -16 348 2 V80 H0 Z" style={{ fill: "var(--foam)" }} />
        </svg>
      </header>

      <nav className={s.tabs} aria-label={c.navLabel}>
        <ul>
          {nav.map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <div className={s.main}>
        <p className={s.introEx}>
          <span className={s.ex}>{c.badge}</span>
          <span>{nb(c.badgeIntro)}</span>
        </p>

        {c.chapters.map((ch) => (
          <section key={ch.id} id={ch.id} className={s.chap} aria-labelledby={`${ch.id}-t`}>
            <p className={s.num}>{ch.num}</p>
            <h2 id={`${ch.id}-t`} className={s.h2}>{nb(ch.title)}</h2>
            <p className={s.story}>{nb(ch.story)}</p>
            <ul className={`${s.facts} ${ch.facts.length === 4 ? s.four : ""}`}>
              {ch.facts.map((f) => <FactCard key={f.big + f.src} f={f} badge={c.badge} />)}
            </ul>
            {ch.chart && <Chart ch={ch.chart} c={c} l={l} />}
          </section>
        ))}

        <section id={c.method.id} className={s.chap} aria-labelledby="methode-t">
          <p className={s.num}>{c.method.num}</p>
          <h2 id="methode-t" className={s.h2}>{c.method.title}</h2>
          <p className={s.story}>
            {nb(c.method.storyBefore)}
            <span className={s.ex}>{c.badge}</span>
            {nb(c.method.storyAfter)}
          </p>
          <ul className={s.collect}>
            {c.method.items.map(([b, t]) => (
              <li key={b}><b>{b}</b>{nb(t)}</li>
            ))}
          </ul>
          <p className={s.note}>{nb(c.method.note)}</p>
          <div className={s.cta}>
            <div>{c.method.cta}</div>
            <CopyEmail email={EMAIL} labels={{ copy: c.method.copy, copied: c.method.copied, selected: c.method.selected }} />
          </div>
          <p className={s.published}>{c.published}</p>
        </section>
      </div>
    </main>
  );
}
