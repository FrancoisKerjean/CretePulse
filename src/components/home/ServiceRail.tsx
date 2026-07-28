"use client";

// Rail « Reserver en direct » : bandeau voiture (format prouve a 5,7 % de clic)
// plus trois cartes de poids egal. Le contenu vient de getHomeServices, la
// visibilite du bloc villa d'un flag serveur.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";
import type { HomeService, HomeServiceId } from "@/lib/home-services";

const COPY_KEY: Record<HomeServiceId, { kicker: string; title: string; sub: string; cta: string }> = {
  car: { kicker: "carRentalKicker", title: "carRentalTitle", sub: "carRentalSub", cta: "carRentalCta" },
  van: { kicker: "serviceRail.van.kicker", title: "serviceRail.van.title", sub: "serviceRail.van.sub", cta: "serviceRail.van.cta" },
  activities: { kicker: "serviceRail.activities.kicker", title: "serviceRail.activities.title", sub: "serviceRail.activities.sub", cta: "serviceRail.activities.cta" },
  stays: { kicker: "serviceRail.stays.kicker", title: "serviceRail.stays.title", sub: "serviceRail.stays.sub", cta: "serviceRail.stays.cta" },
};

function track(service: HomeServiceId, layout: HomeService["layout"]) {
  (window as unknown as { plausible?: (e: string, o?: { props?: Record<string, string> }) => void })
    .plausible?.("service_rail_click", { props: { service, layout } });
}

function Card({ s, band }: { s: HomeService; band: boolean }) {
  const t = useTranslations("home");
  const k = COPY_KEY[s.id];
  const inner = (
    <>
      <ImpressionTracker event="promo_impression" props={{ block: "service-rail", source: "home", service: s.id }} />
      <img src={s.photo} alt="" loading="lazy" aria-hidden
           className="absolute inset-0 h-full w-full object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-105" />
      <div className={`absolute inset-0 ${band
        ? "bg-gradient-to-r from-[#08263a]/85 via-[#08263a]/50 to-[#08263a]/10"
        : "bg-gradient-to-b from-[#08263a]/15 via-[#08263a]/45 to-[#08263a]/88"}`} aria-hidden />
      <div className={`relative ${band ? "p-6 md:p-8 md:min-h-[210px] flex items-center" : "p-5 flex h-full items-end"}`}>
        <div className="min-w-0 max-w-xl">
          <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-heading text-[10.5px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            {t(k.kicker)}
          </p>
          <h3 className={`m-0 mt-3 font-heading font-extrabold leading-tight text-white [text-wrap:balance] drop-shadow-[0_1px_3px_rgba(8,38,58,0.6)] ${band ? "text-[28px] md:text-[32px]" : "text-[19px]"}`}>
            {t(k.title)}
          </h3>
          <p className={`m-0 mt-1.5 text-white/90 drop-shadow-[0_1px_2px_rgba(8,38,58,0.6)] ${band ? "text-[14px]" : "text-[12.5px]"}`}>
            {t(k.sub)}
          </p>
          <span className={`mt-4 inline-flex items-center rounded-full bg-white font-heading font-bold text-terracotta shadow-soft transition-transform group-hover:scale-[1.03] ${band ? "px-7 py-3 text-[14.5px]" : "px-4 py-2 text-[12.5px]"}`}>
            {t(k.cta)}
          </span>
        </div>
      </div>
    </>
  );

  const cls = `group relative block overflow-hidden rounded-[26px] no-underline shadow-card ${band ? "" : "min-h-[200px]"}`;

  return s.external ? (
    <a href={s.href} target="_blank" rel="noopener" className={cls} onClick={() => track(s.id, s.layout)}>{inner}</a>
  ) : (
    <Link href={s.href} className={cls} onClick={() => track(s.id, s.layout)}>{inner}</Link>
  );
}

export function ServiceRail({ services }: { services: HomeService[] }) {
  const t = useTranslations("home");
  const band = services.find((s) => s.layout === "band");
  const cards = services.filter((s) => s.layout === "card");

  return (
    <section className="mt-10">
      <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{t("serviceRail.title")}</h2>
      <p className="text-[13.5px] text-text-muted mt-1 mb-4 max-w-2xl">{t("serviceRail.lead")}</p>
      {band && <Card s={band} band />}
      <div className={`grid gap-3.5 mt-3.5 ${cards.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {cards.map((s) => <Card key={s.id} s={s} band={false} />)}
      </div>
    </section>
  );
}
