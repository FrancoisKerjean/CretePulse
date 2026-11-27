// Briques de confiance de la location de voiture : photo de la vraie voiture du
// loueur, étoiles Google lisibles par un lecteur d'écran, bloc d'avis Google
// avec attribution. Composants serveur, sans état.
import { ratingAriaLabel, formatRating, trustBarCopy } from "@/lib/car-trust";
import { reviewExcerpt } from "@/lib/car-offer-view";
import type { GoogleReview } from "@/lib/google-reviews-server";

export function CarPhoto({
  src640, src1280, alt, sizes = "(min-width: 768px) 480px, 100vw", eager = false, className = "",
}: {
  src640: string | null | undefined;
  src1280?: string | null;
  alt: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
}) {
  if (!src640) {
    // Loueur sans photo : silhouette neutre plutôt qu'une voiture qui n'est pas la sienne.
    return (
      <svg viewBox="0 0 120 60" aria-hidden="true" className={`text-sea/40 ${className}`}>
        <path d="M14 40h92M22 40l8-14c2-4 5-6 10-6h36c5 0 8 2 11 6l9 14M30 40v6m60-6v6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="86" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }
  const big = src1280 && src1280 !== src640 ? src1280 : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- webp déjà dimensionnés (640/1280), pas d'optimiseur à payer
    <img
      src={src640}
      srcSet={big ? `${src640} 640w, ${big} 1280w` : undefined}
      sizes={big ? sizes : undefined}
      alt={alt}
      width={640}
      height={427}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`object-contain ${className}`}
    />
  );
}

const STAR = "M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z";
const starRow = (opacity: number) => (
  <span className="flex gap-0.5" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <svg key={i} viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0"><path d={STAR} fill="currentColor" fillOpacity={opacity} /></svg>
    ))}
  </span>
);

/** 5 étoiles remplies au prorata de la note (sans id SVG, donc répétables sur une page). */
/** `decorative` : le chiffre est écrit à côté, les étoiles ne sont pas relues par le lecteur d'écran. */
export function Stars({ rating, locale, className = "", decorative = false }: { rating: number; locale: string; className?: string; decorative?: boolean }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": ratingAriaLabel(rating, locale) })} className={`relative inline-flex text-sun ${className}`}>
      {starRow(0.25)}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>{starRow(1)}</span>
    </span>
  );
}

/**
 * « ★★★★★ 4,9 · 367 avis Google ». `hideCount` : avant révélation du loueur, le
 * nombre d'avis (qui permettrait de retrouver la fiche) est remplacé par l'attribution
 * « Google Maps » (règles Google Places : non traduit, insécable, Roboto 400,
 * #5E5E5E sur clair ou #FFFFFF sur sombre, 12 à 16 px, dans le conteneur de la note).
 */
export function RatingLine({
  rating, count, locale, countLabel, tone = "light", className = "", hideCount = false,
}: {
  rating: number; count: number; locale: string; countLabel: string; tone?: "light" | "dark"; className?: string; hideCount?: boolean;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] ${className}`}>
      <Stars rating={rating} locale={locale} className="text-[15px]" decorative />
      <strong className={`font-heading ${tone === "dark" ? "text-white" : "text-ink"}`}>{formatRating(rating, locale)}</strong>
      {hideCount ? (
        <span
          translate="no"
          className="whitespace-nowrap"
          style={{ fontFamily: "Roboto, sans-serif", fontWeight: 400, letterSpacing: "normal", fontSize: "13px", color: tone === "dark" ? "#FFFFFF" : "#5E5E5E" }}
        >
          Google Maps
        </span>
      ) : (
        <span className={tone === "dark" ? "text-white/70" : "text-text-muted"}>{countLabel.replace("{n}", count.toLocaleString(locale === "en" ? "en-GB" : locale))}</span>
      )}
    </span>
  );
}

export function ReviewCard({
  review, locale, readMore, readLess, googleReview, tone = "light",
}: {
  review: GoogleReview; locale: string; readMore: string; readLess: string; googleReview: string; tone?: "light" | "dark";
}) {
  const { short, truncated } = reviewExcerpt(review.text);
  const dark = tone === "dark";
  return (
    <article className={`flex flex-col gap-2 rounded-2xl p-4 ${dark ? "border border-white/10 bg-white/[.06]" : "border border-border bg-white"}`}>
      <header className="flex items-center gap-3">
        {review.authorPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar servi par Google, affiché tel quel (règles d'attribution)
          <img src={review.authorPhoto} alt="" width={36} height={36} loading="lazy" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading font-bold ${dark ? "bg-white text-night" : "bg-sea-faint text-sea"}`}>
            {review.author.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className={`m-0 truncate font-heading text-[15px] font-bold ${dark ? "text-white" : "text-ink"}`}>
            {review.authorUri ? <a href={review.authorUri} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{review.author}</a> : review.author}
          </p>
          <p className={`m-0 flex items-center gap-2 text-[12.5px] ${dark ? "text-white/65" : "text-text-muted"}`}>
            <Stars rating={review.rating} locale={locale} className="text-[13px]" />
            {review.relativeTime}
          </p>
        </div>
      </header>
      {truncated ? (
        <details className={`group text-[14px] leading-relaxed ${dark ? "text-white/90" : "text-ink"}`}>
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{short} <span className={`font-bold ${dark ? "text-lagoon" : "text-lagoon-deep"}`}>{readMore}</span></span>
            <span className={`hidden font-bold group-open:inline ${dark ? "text-lagoon" : "text-lagoon-deep"}`}>{readLess}</span>
          </summary>
          <p className="m-0">{review.text}</p>
        </details>
      ) : (
        <p className={`m-0 text-[14px] leading-relaxed ${dark ? "text-white/90" : "text-ink"}`}>{short}</p>
      )}
      <p className={`m-0 mt-auto text-[12px] ${dark ? "text-white/55" : "text-text-muted"}`}>
        {review.reviewUri ? (
          <a href={review.reviewUri} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-2 hover:underline">{googleReview}</a>
        ) : googleReview}
      </p>
    </article>
  );
}

/** Avis Google d'un loueur : 3 au plus, lien vers la fiche, mention légale. Rien sans avis. */
export function GoogleReviewsBlock({
  reviews, mapsUri, locale, title, allReviews, readMore, readLess, googleReview, disclaimer, tone = "light", max = 3, stacked = false,
}: {
  reviews: GoogleReview[]; mapsUri: string | null; locale: string;
  title?: string; allReviews: string; readMore: string; readLess: string; googleReview: string; disclaimer: string;
  tone?: "light" | "dark"; max?: number;
  /** Une colonne : conteneur étroit (page d'état de 36 rem), où trois cartes côte à côte s'écrasent. */
  stacked?: boolean;
}) {
  if (reviews.length === 0) return null;
  const dark = tone === "dark";
  return (
    <section className="flex flex-col gap-3">
      {title || mapsUri ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {title ? <h3 className={`m-0 font-heading text-[18px] font-bold ${dark ? "text-white" : "text-ink"}`}>{title}</h3> : <span />}
          {mapsUri ? (
            <a href={mapsUri} target="_blank" rel="noopener noreferrer nofollow" className={`text-[14px] font-bold ${dark ? "text-lagoon" : "text-lagoon-deep"} hover:underline`}>
              {allReviews} ↗
            </a>
          ) : null}
        </div>
      ) : null}
      <div className={`grid gap-3 ${stacked ? "" : "md:grid-cols-3"}`}>
        {reviews.slice(0, max).map((r) => (
          <ReviewCard key={`${r.author}-${r.publishTime}`} review={r} locale={locale} readMore={readMore} readLess={readLess} googleReview={googleReview} tone={tone} />
        ))}
      </div>
      {/* Attribution exigée par Google : « Google Maps » non traduit, et comment les avis sont triés et filtrés. */}
      <p className={`m-0 text-[12.5px] ${dark ? "text-white/60" : "text-text-muted"}`}><span translate="no" className="font-bold">Google Maps</span> · {disclaimer}</p>
    </section>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 shrink-0 ${className}`}>
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Bandeau sous le titre des pages de location : le nombre de nos agences actives, puis,
 * acompte allumé seulement, les deux garanties qu'il apporte. ⛔ Pas de note Google
 * moyenne (politique Places : contenu dérivé interdit). Interrupteur éteint, aucune
 * promesse liée à l'acompte.
 */
export function TrustBar({ agencyCount, locale, depositOn, className = "" }: { agencyCount: number; locale: string; depositOn: boolean; className?: string }) {
  const c = trustBarCopy(agencyCount, locale);
  if (!c.agencies && !depositOn) return null;
  return (
    <ul className={`m-0 flex list-none flex-wrap items-center gap-x-6 gap-y-2 p-0 text-[14px] text-text-muted ${className}`}>
      {c.agencies ? (
        <li className="flex items-center gap-2">
          <CheckIcon className="text-lagoon-deep" />
          <span>{c.agencies}</span>
        </li>
      ) : null}
      {depositOn ? (
        <>
          <li className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-lagoon-deep" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            {c.confirm}
          </li>
          <li className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-lagoon-deep" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            {c.cancel}
          </li>
        </>
      ) : null}
    </ul>
  );
}
