"use client";

// Footer nuit Kalimera : vague d'entree, wordmark creme, colonnes par univers.
// Reference visuelle : docs/design/kalimera/home-v8.html (footer).
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Wordmark } from "@/components/Wordmark";
import { AFFILIATE_LINKS } from "@/lib/affiliates";
import { CiInstagram, CiFacebook, CiYouTube } from "@/components/icons";

type Ui = "en" | "fr" | "de" | "el";
const pickUi = (l: string): Ui => (["en", "fr", "de", "el"].includes(l) ? (l as Ui) : "en");

const F = {
  tagline: {
    en: "The practical companion to Crete. Live data, free, independent. Made on the island.",
    fr: "Le compagnon pratique de la Crète. Données live, gratuit, indépendant. Fait sur l'île.",
    de: "Der praktische Begleiter für Kreta. Live-Daten, kostenlos, unabhängig. Auf der Insel gemacht.",
    el: "Ο πρακτικός σύντροφος της Κρήτης. Live δεδομένα, δωρεάν, ανεξάρτητο. Φτιαγμένο στο νησί.",
  },
  plan: { en: "Plan", fr: "Planifier", de: "Planen", el: "Σχεδιασμός" },
  discover: { en: "Discover", fr: "Découvrir", de: "Entdecken", el: "Ανακαλύψτε" },
  today: { en: "Today", fr: "Aujourd'hui", de: "Heute", el: "Σήμερα" },
  info: { en: "Info", fr: "Infos", de: "Info", el: "Πληροφορίες" },
  news: { en: "News", fr: "Actus", de: "Nachrichten", el: "Νέα" },
  events: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις" },
  guides: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί" },
  explore: { en: "Explore", fr: "Explorer", de: "Entdecken", el: "Εξερεύνηση" },
  madeInCrete: { en: "Made in Crete ☀", fr: "Fait en Crète ☀", de: "Gemacht auf Kreta ☀", el: "Φτιαγμένο στην Κρήτη ☀" },
} as const;

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-heading text-lagoon text-sm font-bold m-0 mb-3">{title}</h4>
      <div className="space-y-2.5 text-[13.5px]">{children}</div>
    </div>
  );
}

const linkCls = "block text-[#EAF7FA]/75 hover:text-white transition-colors no-underline";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const ui = pickUi(locale);
  const carRental = AFFILIATE_LINKS.carRental;
  const carRentalLabel =
    carRental.label[locale as keyof typeof carRental.label] || carRental.label.en;

  return (
    <footer className="relative bg-night text-[#EAF7FA]/75 mt-[70px]">
      {/* vague d'entree */}
      <svg
        className="absolute top-0 left-0 w-full h-[60px] -translate-y-full"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 35 C200 5 360 60 580 38 C800 16 960 58 1180 36 C1320 22 1400 30 1440 26 L1440 60 L0 60 Z" fill="#07374A" />
      </svg>

      <div className="max-w-6xl mx-auto px-4 pt-12 pb-7">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-8">
          {/* Brand */}
          <div>
            <Link href="/" aria-label="cretedirect home" className="inline-block">
              <Wordmark variant="dark" width={138} />
            </Link>
            <p className="text-[13px] leading-relaxed mt-3.5 max-w-[280px]">
              {F.tagline[ui]}
            </p>
            {/* Socials Kalimera : lagoon hover sun */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.instagram.com/cretedirect/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Crete Direct on Instagram"
                className="text-lagoon/85 hover:text-sun transition-colors"
              >
                <CiInstagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/1098023870060924"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Crete Direct on Facebook"
                className="text-lagoon/85 hover:text-sun transition-colors"
              >
                <CiFacebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.youtube.com/@CreteDirect"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Crete Direct on YouTube"
                className="text-lagoon/85 hover:text-sun transition-colors"
              >
                <CiYouTube className="w-5 h-5" />
              </a>
            </div>
          </div>

          <Col title={F.plan[ui]}>
            <Link href="/buses" className={linkCls}>{t("buses")}</Link>
            <Link href="/airport" className={linkCls}>{t("airports")}</Link>
            <Link href="/weather" className={linkCls}>{t("weather")}</Link>
            {/* Affiliate (DiscoverCars). Site-wide incl. homepage: secures the
                partner's lifetime 80% homepage-link offer (11/06/2026). */}
            <a
              href={carRental.url}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className={linkCls}
            >
              {carRentalLabel}
            </a>
          </Col>

          <Col title={F.discover[ui]}>
            <Link href="/beaches" className={linkCls}>{t("beaches")}</Link>
            <Link href="/explore" className={linkCls}>{F.explore[ui]}</Link>
            <Link href="/villages" className={linkCls}>{t("villages")}</Link>
            <Link href="/food" className={linkCls}>{t("food")}</Link>
            <Link href="/hikes" className={linkCls}>{t("hikes")}</Link>
          </Col>

          <Col title={F.today[ui]}>
            <Link href="/news" className={linkCls}>{F.news[ui]}</Link>
            <Link href="/events" className={linkCls}>{F.events[ui]}</Link>
            <Link href="/articles" className={linkCls}>{F.guides[ui]}</Link>
            <Link href="/submit-event" className={linkCls}>{t("submitEvent")}</Link>
          </Col>

          <Col title={F.info[ui]}>
            <Link href="/about" className={linkCls}>{t("about_link")}</Link>
            <Link href="/privacy" className={linkCls}>{t("privacy")}</Link>
            <Link href="/property-management" className={linkCls}>{t("propertyManagement")}</Link>
            <a href="mailto:hello@crete.direct" className={linkCls}>{t("contact")}</a>
          </Col>
        </div>

        {/* Legal */}
        <div className="mt-9 pt-4 border-t border-[#EAF7FA]/12 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#EAF7FA]/45">
          <span>&copy; {new Date().getFullYear()} Crete Direct · {t("rights")}</span>
          <span className="flex items-center gap-4">
            <span>{F.madeInCrete[ui]}</span>
            <a href="https://nov-ai.xyz" rel="external" className="hover:text-[#EAF7FA] transition-colors no-underline text-[#EAF7FA]/45">
              Built by NovAI
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
