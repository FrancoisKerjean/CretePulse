// Seul endroit qui connaît les trois services derrière un ArticlePromo. Composant
// SERVEUR : les textes viennent de getTranslations (namespace articlePromo, 22 locales),
// l'encart est dans le HTML servi par le CDN, aucun fetch client.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §3.4
import { getTranslations } from "next-intl/server";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { VanPromo } from "@/components/VanPromo";
import { BusPromo } from "@/components/buses/BusPromo";
import { vanGenericFacts, type ArticlePromo } from "@/lib/article-promo";

/** Valeur de la prop source de tous les events issus d'un article. */
export const ARTICLE_PROMO_SOURCE = "article";

export async function ArticlePromoSlot({ promo, locale, slug }: { promo: ArticlePromo; locale: string; slug: string }) {
  if (promo.kind === "none") return null;
  const t = await getTranslations({ locale, namespace: "articlePromo" });
  const v = promo.variant;

  if (promo.kind === "car") {
    const copy = {
      title: t(`car.v${v}.title`),
      line: t(`car.v${v}.line`),
      cta: t(`car.v${v}.cta`),
      disclosure: t("disclosure.car"),
    };
    return (
      <CarPromo
        locale={locale}
        pickup={promo.pickup}
        landing={promo.landing}
        source={ARTICLE_PROMO_SOURCE}
        slug={slug}
        variant={v}
        copy={copy}
      />
    );
  }

  if (promo.kind === "van") {
    if (promo.corridor) {
      const c = promo.corridor;
      const vars = { from: c.fromName, to: c.toName, price: c.priceEur };
      const copy = {
        title: t(`van.corridor.v${v}.title`, vars),
        line: t(`van.corridor.v${v}.line`, vars),
        cta: t(`van.corridor.v${v}.cta`),
        disclosure: t("disclosure.van"),
      };
      return <VanPromo locale={locale} corridors={[c]} source={ARTICLE_PROMO_SOURCE} slug={slug} variant={v} copy={copy} />;
    }
    const facts = vanGenericFacts();
    const copy = {
      title: t(`van.generic.v${v}.title`, facts),
      line: t(`van.generic.v${v}.line`, facts),
      cta: t(`van.generic.v${v}.cta`),
      disclosure: t("disclosure.van"),
    };
    return (
      <VanPromo
        locale={locale}
        generic
        source={ARTICLE_PROMO_SOURCE}
        slug={slug}
        variant={v}
        copy={copy}
      />
    );
  }

  // bus
  const copy = promo.busFrom
    ? {
        title: t(`bus.pair.v${v}.title`, { from: promo.busFrom, to: promo.busTo ?? "" }),
        line: t(`bus.pair.v${v}.line`, { from: promo.busFrom, to: promo.busTo ?? "" }),
        cta: t(`bus.pair.v${v}.cta`),
        disclosure: t("disclosure.bus"),
      }
    : {
        title: t("bus.generic.title"),
        line: t("bus.generic.line"),
        cta: t("bus.generic.cta"),
        disclosure: t("disclosure.bus"),
      };
  return (
    <BusPromo
      locale={locale}
      copy={copy}
      source={ARTICLE_PROMO_SOURCE}
      slug={slug}
      variant={v}
      from={promo.busFrom}
      to={promo.busTo}
    />
  );
}
