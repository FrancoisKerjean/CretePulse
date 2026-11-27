// Présentation des offres, direction « une recommandation » (maquette C du
// 27/11/2026) : l'offre la moins chère en tête, avec la raison affichée, sa
// note et ses avis Google ; les autres en lignes comparables dessous.
// Composants serveur ; la logique d'état (acompte, refus, téléphone) reste dans
// page.tsx et AcceptButton.
import { AcceptButton, type AcceptRefusals } from "./AcceptButton";
import { CarPhoto, CheckIcon, GoogleReviewsBlock, RatingLine } from "@/components/car-rental/trust";
import { formatEur } from "@/lib/car-format";
import type { OfferViewCopy } from "@/lib/car-offer-view";
import type { GoogleReview } from "@/lib/google-reviews-server";
import type { FleetPhoto } from "@/lib/car-fleet";

export interface OfferItem {
  id: number;
  token: string;
  partner: string;
  price: number;
  /** Montant formaté dans la langue du client (ou « €412 » hors euro). */
  priceText: string;
  /** « 28 € aujourd'hui · 252 € au comptoir », seulement avec acompte. */
  splitText: string | null;
  rating: { rating: number; count: number } | null;
  reviews: GoogleReview[];
  mapsUri: string | null;
  photo: FleetPhoto | null;
  model: string | null;
  gearbox: string | null;
  note: string | null;
  insurance: string[];
  inclusions: string[];
  /** Texte à la place du bouton (offre expirée, déclinée, trop proche du départ). */
  blockedText: string | null;
  buttonLabel: string;
  doneText: string;
  expiredText: string;
  needsPhone: boolean;
  phoneLabel: string;
  phoneHint: string;
  phoneError: string;
  errorText: string;
  rank: number;
  total: number;
  refusals: AcceptRefusals;
}

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));

function ModelLine({ item, v, dark }: { item: OfferItem; v: OfferViewCopy; dark: boolean }) {
  const shown = item.model ?? item.photo?.model ?? null;
  if (!shown && !item.gearbox) return null;
  return (
    <p className={`m-0 text-[15px] leading-snug ${dark ? "text-white/85" : "text-text-muted"}`}>
      {shown ? <><strong className={dark ? "text-white" : "text-ink"}>{shown}</strong> {v.orSimilar}</> : null}
      {shown && item.gearbox ? " · " : null}
      {item.gearbox}
    </p>
  );
}

/** Assurance en une ligne : c'est ce qui distingue deux prix proches. */
function Cover({ item }: { item: OfferItem }) {
  if (!item.insurance.length) return null;
  return <p className="m-0 mt-0.5 text-[13px] leading-snug text-text-muted">{item.insurance.join(" · ")}</p>;
}

function Blocked({ text }: { text: string }) {
  return <p role="status" className="m-0 rounded-xl bg-warn/15 px-4 py-3 text-[14.5px] leading-normal text-ink">{text}</p>;
}

function Accept({ item, variant }: { item: OfferItem; variant: "primary" | "compact" }) {
  if (item.blockedText) return <Blocked text={item.blockedText} />;
  return (
    <AcceptButton
      token={item.token} optionId={item.id} label={item.buttonLabel} doneText={item.doneText} expiredText={item.expiredText}
      needsPhone={item.needsPhone} phoneLabel={item.phoneLabel} phoneHint={item.phoneHint} phoneError={item.phoneError}
      rank={item.rank} offers={item.total} refusals={item.refusals} variant={variant} errorText={item.errorText}
    />
  );
}

export function PickCard({
  item, v, locale, eyebrow, reason, daysText, guarantees,
}: {
  item: OfferItem; v: OfferViewCopy; locale: string; eyebrow: string; reason: string; daysText: string; guarantees: string[];
}) {
  const alt = fill(v.photoAlt, { model: item.photo?.model ?? item.model ?? "", partner: item.partner });
  // Le modèle proposé n'est pas dans la flotte en ligne : la photo est une autre voiture de l'agence, on le dit.
  const otherPhoto = Boolean(item.photo && !item.photo.exact && item.model);
  const hasList = guarantees.length > 0 || item.insurance.length > 0 || item.inclusions.length > 0;
  const list = (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px] text-white/85">
      {guarantees.map((g) => <li key={g} className="flex items-start gap-2"><CheckIcon className="mt-0.5 text-lagoon" />{g}</li>)}
      {item.insurance.map((g) => <li key={g} className="flex items-start gap-2"><CheckIcon className="mt-0.5 text-lagoon" />{g}</li>)}
      {item.inclusions.length ? <li className="flex items-start gap-2"><CheckIcon className="mt-0.5 text-lagoon" />{item.inclusions.join(" · ")}</li> : null}
    </ul>
  );
  return (
    <section aria-labelledby="pick-title" className="mt-2">
      <p className="m-0 mb-2 font-heading text-[12px] font-bold uppercase tracking-[.12em] text-lagoon-deep">{eyebrow}</p>
      <div className="overflow-hidden rounded-[28px] bg-night text-white shadow-[0_18px_40px_rgba(7,55,74,0.22)]">
        <div className="grid gap-5 p-4 md:grid-cols-[1.05fr_1fr] md:gap-7 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-2xl bg-white">
              <CarPhoto src640={item.photo?.src640} src1280={item.photo?.src1280} alt={alt} eager className="h-full w-full" />
            </div>
            {otherPhoto ? <p className="m-0 text-[12.5px] text-white/60">{fill(v.photoOther, { model: item.photo!.model })}</p> : null}
            {hasList ? <div className="hidden md:mt-2 md:block">{list}</div> : null}
          </div>
          <div className="flex flex-col gap-3">
            <h2 id="pick-title" className="m-0 font-heading text-[26px] font-extrabold leading-tight md:text-[30px]">{item.partner}</h2>
            {item.rating ? <RatingLine rating={item.rating.rating} count={item.rating.count} locale={locale} countLabel={v.googleReviews} tone="dark" /> : null}
            <ModelLine item={item} v={v} dark />
            {item.note ? <p className="m-0 rounded-xl bg-white/[.07] px-3.5 py-2.5 text-[14px] leading-normal text-white/85">« {item.note} »</p> : null}
            <p className="m-0 flex items-start gap-2 rounded-xl border border-sun/40 bg-sun/10 px-3.5 py-2.5 text-[14px] leading-normal text-sun">
              <CheckIcon className="mt-0.5" />{reason}
            </p>
            <div>
              <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                <span className="font-heading text-[44px] font-extrabold leading-none">{item.priceText}</span>
                <span className="text-[15px] text-white/75">{fill(v.forDays, { days: daysText })}</span>
              </p>
              {item.splitText ? <p className="m-0 mt-1.5 text-[14px] font-bold text-white/90">{item.splitText}</p> : null}
            </div>
            <Accept item={item} variant="primary" />
            {hasList ? <div className="md:hidden">{list}</div> : null}
          </div>
        </div>
        {item.reviews.length ? (
          <div className="border-t border-white/10 bg-white/[.03] p-4 md:p-6">
            <GoogleReviewsBlock
              reviews={item.reviews} mapsUri={item.mapsUri} locale={locale} tone="dark"
              title={v.reviewsTitle} allReviews={v.allReviews} readMore={v.readMore} googleReview={v.googleReview} disclaimer={v.disclaimer}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function OfferRow({ item, v, locale, delta }: { item: OfferItem; v: OfferViewCopy; locale: string; delta: number }) {
  const alt = fill(v.photoAlt, { model: item.photo?.model ?? item.model ?? "", partner: item.partner });
  return (
    <li className="p-3 md:p-4">
      <div className="grid grid-cols-[88px_1fr] items-center gap-3 md:grid-cols-[110px_1.3fr_1fr_auto] md:gap-5">
        <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl bg-foam">
          <CarPhoto src640={item.photo?.src640} alt={alt} sizes="110px" className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="m-0 font-heading text-[16px] font-bold text-ink">{item.partner}</p>
          {item.rating ? <RatingLine rating={item.rating.rating} count={item.rating.count} locale={locale} countLabel={v.googleReviews} className="text-[13px]" /> : null}
          <div className="md:hidden"><ModelLine item={item} v={v} dark={false} /><Cover item={item} /></div>
        </div>
        <div className="hidden md:block"><ModelLine item={item} v={v} dark={false} /><Cover item={item} /></div>
        <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-end">
          <div className="text-left md:text-right">
            <p className="m-0 font-heading text-[19px] font-extrabold text-ink">{item.priceText}</p>
            {delta > 0 ? <p className="m-0 text-[13px] font-bold text-terracotta">+{formatEur(delta, locale)}</p> : null}
          </div>
          <Accept item={item} variant="compact" />
        </div>
      </div>
      {item.reviews.length ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-[14px] font-bold text-lagoon-deep [&::-webkit-details-marker]:hidden">
            {v.readReviews} <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="mt-3">
            <GoogleReviewsBlock
              reviews={item.reviews} mapsUri={item.mapsUri} locale={locale}
              allReviews={v.allReviews} readMore={v.readMore} googleReview={v.googleReview} disclaimer={v.disclaimer}
            />
          </div>
        </details>
      ) : null}
    </li>
  );
}
