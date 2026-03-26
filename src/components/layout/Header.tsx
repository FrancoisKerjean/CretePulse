"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Globe, ChevronDown } from "lucide-react";

const LOCALES = [
  { code: "en", label: "EN", name: "English" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "el", label: "EL", name: "Ελληνικά" },
  { code: "es", label: "ES", name: "Español" },
  { code: "it", label: "IT", name: "Italiano" },
  { code: "pt", label: "PT", name: "Português" },
  { code: "nl", label: "NL", name: "Nederlands" },
  { code: "pl", label: "PL", name: "Polski" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "tr", label: "TR", name: "Türkçe" },
  { code: "ja", label: "JA", name: "日本語" },
  { code: "ko", label: "KO", name: "한국어" },
  { code: "zh", label: "ZH", name: "中文" },
  { code: "sv", label: "SV", name: "Svenska" },
  { code: "da", label: "DA", name: "Dansk" },
  { code: "no", label: "NO", name: "Norsk" },
  { code: "fi", label: "FI", name: "Suomi" },
  { code: "cs", label: "CS", name: "Čeština" },
  { code: "hu", label: "HU", name: "Magyar" },
  { code: "ro", label: "RO", name: "Română" },
  { code: "ar", label: "AR", name: "العربية" },
];

const NAV_LINKS = [
  { href: "/weather", label: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός", it: "Meteo", nl: "Weer", pl: "Pogoda", es: "Clima", pt: "Tempo", ru: "Погода", ja: "天気", ko: "날씨", zh: "天气", tr: "Hava", sv: "Väder", da: "Vejr", no: "Vær", fi: "Sää", cs: "Počasí", hu: "Időjárás", ro: "Vreme", ar: "طقس" } },
  { href: "/beaches", label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες", it: "Spiagge", nl: "Stranden", pl: "Plaże", es: "Playas", pt: "Praias", ru: "Пляжи", ja: "ビーチ", ko: "해변", zh: "海滩", tr: "Plajlar", sv: "Stränder", da: "Strande", no: "Strender", fi: "Rannat", cs: "Pláže", hu: "Strandok", ro: "Plaje", ar: "شواطئ" } },
  { href: "/villages", label: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά", it: "Villaggi", nl: "Dorpen", pl: "Wioski", es: "Pueblos", pt: "Aldeias", ru: "Деревни", ja: "村", ko: "마을", zh: "村庄", tr: "Köyler", sv: "Byar", da: "Landsbyer", no: "Landsbyer", fi: "Kylät", cs: "Vesnice", hu: "Falvak", ro: "Sate", ar: "قرى" } },
  { href: "/events", label: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις", it: "Eventi", nl: "Evenementen", pl: "Wydarzenia", es: "Eventos", pt: "Eventos", ru: "События", ja: "イベント", ko: "이벤트", zh: "活动", tr: "Etkinlikler", sv: "Evenemang", da: "Begivenheder", no: "Arrangementer", fi: "Tapahtumat", cs: "Události", hu: "Események", ro: "Evenimente", ar: "فعاليات" } },
  { href: "/food", label: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό", it: "Ristoranti", nl: "Eten", pl: "Restauracje", es: "Comida", pt: "Comida", ru: "Еда", ja: "グルメ", ko: "맛집", zh: "美食", tr: "Yemek", sv: "Mat", da: "Mad", no: "Mat", fi: "Ruoka", cs: "Jídlo", hu: "Éttermek", ro: "Mâncare", ar: "طعام" } },
  { href: "/hikes", label: { en: "Hikes", fr: "Randos", de: "Wandern", el: "Πεζοπορία", it: "Escursioni", nl: "Wandelen", pl: "Szlaki", es: "Rutas", pt: "Trilhas", ru: "Походы", ja: "ハイキング", ko: "하이킹", zh: "徒步", tr: "Yürüyüş", sv: "Vandringar", da: "Vandreture", no: "Turer", fi: "Vaellukset", cs: "Túry", hu: "Túrák", ro: "Drumeții", ar: "مشي" } },
  { href: "/news", label: { en: "News", fr: "Actus", de: "Nachrichten", el: "Νέα", it: "Notizie", nl: "Nieuws", pl: "Wiadomości", es: "Noticias", pt: "Notícias", ru: "Новости", ja: "ニュース", ko: "뉴스", zh: "新闻", tr: "Haberler", sv: "Nyheter", da: "Nyheder", no: "Nyheter", fi: "Uutiset", cs: "Zprávy", hu: "Hírek", ro: "Știri", ar: "أخبار" } },
  { href: "/articles", label: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί", it: "Guide", nl: "Gidsen", pl: "Przewodniki", es: "Guías", pt: "Guias", ru: "Гиды", ja: "ガイド", ko: "가이드", zh: "指南", tr: "Rehber", sv: "Guider", da: "Guides", no: "Guider", fi: "Oppaat", cs: "Průvodce", hu: "Útmutatók", ro: "Ghiduri", ar: "أدلة" } },
];

function LocaleSwitcher({ locale, pathname, router }: { locale: string; pathname: string; router: ReturnType<typeof useRouter> }) {
  const [langOpen, setLangOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setLangOpen(!langOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:bg-stone-warm hover:text-text transition-all"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
      </button>

      {langOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 max-h-80 overflow-y-auto bg-white rounded-xl border border-border shadow-xl z-50">
          <div className="py-1">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  router.replace(pathname, { locale: l.code });
                  setLangOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                  locale === l.code
                    ? "bg-aegean/8 text-aegean font-semibold"
                    : "text-text-muted hover:bg-stone hover:text-text"
                }`}
              >
                <span>{l.name}</span>
                <span className="text-[10px] font-mono text-text-light">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMobileLangOpen(false);
  }, [pathname]);

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <nav
      className={`sticky top-0 z-50 bg-surface/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_20px_rgba(27,73,101,0.10)]" : "border-b border-border"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-extrabold tracking-tight text-aegean group-hover:text-aegean-light transition-colors">
            CRETE
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terra opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-terra" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-terra group-hover:text-terra-light transition-colors">
            DIRECT
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-aegean transition-colors relative pb-0.5 ${
                pathname?.startsWith(link.href)
                  ? "text-aegean after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-terra after:rounded-full"
                  : ""
              }`}
            >
              {link.label[locale as keyof typeof link.label] || link.label.en}
            </Link>
          ))}
        </div>

        {/* Right: locale dropdown + mobile hamburger */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} pathname={pathname} router={router} />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-text-muted hover:text-aegean transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface/98 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  pathname?.startsWith(link.href)
                    ? "bg-aegean/8 text-aegean"
                    : "text-text-muted hover:bg-stone hover:text-text"
                }`}
              >
                {link.label[locale as keyof typeof link.label] || link.label.en}
              </Link>
            ))}

            {/* Mobile locale switcher - collapsible */}
            <div className="pt-3 mt-2 border-t border-border">
              <button
                onClick={() => setMobileLangOpen(!mobileLangOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:bg-stone transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {currentLocale.name}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileLangOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileLangOpen && (
                <div className="mt-1 grid grid-cols-3 gap-1.5 px-1">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        router.replace(pathname, { locale: l.code });
                        setMobileLangOpen(false);
                      }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                        locale === l.code
                          ? "bg-aegean text-white shadow-sm"
                          : "text-text-muted bg-stone hover:bg-stone-warm"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
