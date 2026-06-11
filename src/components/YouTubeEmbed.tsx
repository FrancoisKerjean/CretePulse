/**
 * YouTubeEmbed · Responsive iframe lazy-loaded pour les vidéos daily auto-générées.
 * Aspect ratio 9:16 (vertical Shorts) sur mobile, 16:9 sur desktop.
 * Loading lazy + privacy-enhanced via youtube-nocookie.com (pas de cookies tant que pas joué).
 */

const LABELS: Record<string, string> = {
  en: "Watch the daily bulletin",
  fr: "Bulletin du jour en vidéo",
  de: "Tagesbulletin als Video",
  el: "Δείτε το ημερήσιο δελτίο",
};

export default function YouTubeEmbed({
  videoId,
  title,
  locale,
  vertical = true,
}: {
  videoId: string;
  title: string;
  locale: string;
  vertical?: boolean;
}) {
  const label = LABELS[locale] || LABELS.en;
  // Aspect ratio : vertical 9:16 max-width contenu, sinon 16:9 plein cadre.
  const aspectClass = vertical ? "aspect-[9/16] max-w-[400px] mx-auto" : "aspect-video";
  return (
    <figure className="my-6 not-prose">
      <div className={`relative overflow-hidden rounded-lg shadow-lg bg-black ${aspectClass}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <figcaption className="mt-2 text-center text-xs text-text-light">{label}</figcaption>
    </figure>
  );
}
