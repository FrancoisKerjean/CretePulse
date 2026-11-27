// Présentation des offres, direction « une recommandation » (maquette C du
// 27/11/2026) : l'offre la moins chère en tête, avec la raison affichée et la
// note Google de l'agence ; les autres en lignes comparables dessous.
// ⛔ Le loueur n'est JAMAIS identifiable ici (décision du 27/11/2026) : ni nom,
// ni nombre d'avis, ni avis, ni lien Maps, ni dossier de photo. Il se révèle
// après l'acompte (ou l'acceptation), sur les panneaux d'état de page.tsx.
// Composants serveur ; la logique d'état (acompte, refus, téléphone) reste dans
// page.tsx et AcceptButton.
import { AcceptButton, type AcceptRefusals } from "./AcceptButton";
import { CarPhoto, CheckIcon, RatingLine } from "@/components/car-rental/trust";
import { formatEur } from "@/lib/car-format";
import { photoAltFor, type OfferViewCopy } from "@/lib/car-offer-view";
import type { FleetPhoto } from "@/lib/car-fleet";

export interface OfferItem {
  id: number;
  token: string;
  price: number;
  /** Montant formaté dans la langue du client (ou « €412 » hors euro). */
  priceText: string;
  /** « 28 € aujourd'hui · 252 € au comptoir », seulement avec acompte. */
  splitText: string | null;
  /** Note seule : le nombre d'avis identifierait la fiche Google du loueur. */
  rating: number | null;
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
  // Seul le modèle écrit par le loueur est nommé (la page de réservation fait de même).
  const shown = item.model ?? null;
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

/** Inclusions et note du loueur : ce qui explique un prix plus haut, visible avant de payer l'acompte. */
function RowExtras({ item }: { item: OfferItem }) {
  if (!item.inclusions.length && !item.note) return null;
  return (
    <>
      {item.inclusions.length ? <p className="m-0 mt-0.5 text-[13px] leading-snug text-text-muted">{item.inclusions.join(" · ")}</p> : null}
      {item.note ? <p className="m-0 mt-1 line-clamp-2 text-[13px] italic leading-snug text-text-muted">« {item.note} »</p> : null}
    </>
  );
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
  item, v, locale, eyebrow, reason, daysText, guarantees, revealLine,
}: {
  item: OfferItem; v: OfferViewCopy; locale: string; eyebrow: string; reason: string; daysText: string; guarantees: string[];
  /** « Le nom de l'agence et ses avis Google s'affichent dès l'acompte payé. » */
  revealLine: string;
}) {
  const alt = photoAltFor(locale, item.photo?.model ?? item.model ?? "", "", false);
  // Photo qui n'est pas le modèle proposé (absent de la flotte en ligne, ou aucun modèle précisé) : on le dit.
  const otherPhoto = Boolean(item.photo && !item.photo.exact);
  const terms = [...item.insurance, ...(item.inclusions.length ? [item.inclusions.join(" · ")] : [])];
  const hasList = guarantees.length > 0 || terms.length > 0;
  // Coches = engagements de crete.direct (confirmation, annulation). Ce que le loueur inclut
  // (assurance, kilométrage) est à part, à son nom, sans coche : crete.direct ne présente pas d'assurance.
  const list = (
    <div className="flex flex-col gap-3">
      {guarantees.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px] text-white/85">
          {guarantees.map((g) => <li key={g} className="flex items-start gap-2"><CheckIcon className="mt-0.5 text-lagoon" />{g}</li>)}
        </ul>
      ) : null}
      {terms.length ? (
        <div className="rounded-xl bg-white/[.06] px-3.5 py-2.5">
          <p className="m-0 mb-1 text-[12.5px] font-bold text-white/70">{v.agencyTermsHidden}</p>
          <ul className="m-0 list-disc pl-4 text-[13.5px] leading-relaxed text-white/80 marker:text-white/40">
            {terms.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
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
            <h2 id="pick-title" className="m-0 font-heading text-[26px] font-extrabold leading-tight md:text-[30px]">{v.agencyHidden}</h2>
            {item.rating ? <RatingLine rating={item.rating} count={0} locale={locale} countLabel={v.googleReviews} tone="dark" hideCount /> : null}
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
            {item.blockedText ? null : <p className="m-0 text-[13px] leading-snug text-white/70">{revealLine}</p>}
            {hasList ? <div className="md:hidden">{list}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OfferRow({ item, v, locale, delta }: { item: OfferItem; v: OfferViewCopy; locale: string; delta: number }) {
  const alt = photoAltFor(locale, item.photo?.model ?? item.model ?? "", "", false);
  return (
    <li className="p-3 md:p-4">
      <div className="grid grid-cols-[88px_1fr] items-center gap-3 md:grid-cols-[110px_1.3fr_1fr_auto] md:gap-5">
        <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl bg-foam">
          <CarPhoto src640={item.photo?.src640} alt={alt} sizes="110px" className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="m-0 font-heading text-[16px] font-bold text-ink">{v.agencyHidden}</p>
          {item.rating ? <RatingLine rating={item.rating} count={0} locale={locale} countLabel={v.googleReviews} className="text-[13px]" hideCount /> : null}
          <div className="md:hidden"><ModelLine item={item} v={v} dark={false} /><Cover item={item} /><RowExtras item={item} /></div>
        </div>
        <div className="hidden md:block"><ModelLine item={item} v={v} dark={false} /><Cover item={item} /><RowExtras item={item} /></div>
        <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-end">
          <div className="text-left md:text-right">
            <p className="m-0 font-heading text-[19px] font-extrabold text-ink">{item.priceText}</p>
            {delta > 0 ? <p className="m-0 text-[13px] font-bold text-terracotta-deep">+{formatEur(delta, locale)}</p> : null}
          </div>
          <Accept item={item} variant="compact" />
        </div>
      </div>
    </li>
  );
}
