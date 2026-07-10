"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Globe, ChevronDown, Search } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { LivePill } from "@/components/LivePill";

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

type NavLabel = Record<string, string>;
type NavLink = { href: string; label: NavLabel };

// Nav "3 univers" (spec 2026-06-11) : Plan (preparer un deplacement),
// Discover (explorer l'ile), Today (le flux du jour). 22 langues.
const LINKS: Record<string, NavLink> = {
  buses: { href: "/buses", label: { en: "Buses", fr: "Bus", de: "Busse", el: "Λεωφορεία", it: "Autobus", nl: "Bussen", pl: "Autobusy", es: "Autobuses", pt: "Autocarros", ru: "Автобусы", ja: "バス", ko: "버스", zh: "巴士", tr: "Otobüsler", sv: "Bussar", da: "Busser", no: "Busser", fi: "Bussit", cs: "Autobusy", hu: "Buszok", ro: "Autobuze", ar: "حافلات" } },
  live: { href: "/live", label: { en: "Live", fr: "Live", de: "Live", el: "Live", it: "Live", nl: "Live", pl: "Live", es: "Live", pt: "Live", ru: "Live", ja: "Live", ko: "Live", zh: "Live", tr: "Live", sv: "Live", da: "Live", no: "Live", fi: "Live", cs: "Live", hu: "Live", ro: "Live", ar: "Live" } },
  airports: { href: "/airport", label: { en: "Airports", fr: "Aéroports", de: "Flughäfen", el: "Αεροδρόμια", it: "Aeroporti", nl: "Luchthavens", pl: "Lotniska", es: "Aeropuertos", pt: "Aeroportos", ru: "Аэропорты", ja: "空港", ko: "공항", zh: "机场", tr: "Havalimanları", sv: "Flygplatser", da: "Lufthavne", no: "Flyplasser", fi: "Lentokentät", cs: "Letiště", hu: "Repülőterek", ro: "Aeroporturi", ar: "مطارات" } },
  weather: { href: "/weather", label: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός", it: "Meteo", nl: "Weer", pl: "Pogoda", es: "Clima", pt: "Tempo", ru: "Погода", ja: "天気", ko: "날씨", zh: "天气", tr: "Hava", sv: "Väder", da: "Vejr", no: "Vær", fi: "Sää", cs: "Počasí", hu: "Időjárás", ro: "Vreme", ar: "طقس" } },
  nearMe: { href: "/near-me", label: { en: "Near me", fr: "Autour de moi", de: "In meiner Nähe", el: "Κοντά μου", it: "Vicino a me", nl: "In de buurt", pl: "W pobliżu", es: "Cerca de mí", pt: "Perto de mim", ru: "Рядом со мной", ja: "近くのスポット", ko: "내 주변", zh: "我附近", tr: "Yakınımda", sv: "Nära mig", da: "Nær mig", no: "Nær meg", fi: "Lähelläni", cs: "Poblíž", hu: "Közelemben", ro: "Lângă mine", ar: "بالقرب مني" } },
  carRental: { href: "/car-rental", label: { en: "Rent a car", fr: "Louer une voiture", de: "Mietwagen", el: "Ενοικίαση αυτοκινήτου", it: "Noleggio auto", nl: "Auto huren", pl: "Wynajem auta", es: "Alquiler de coche", pt: "Alugar carro", ru: "Аренда авто", ja: "レンタカー", ko: "렌터카", zh: "租车", tr: "Araç kiralama", sv: "Hyrbil", da: "Billeje", no: "Leiebil", fi: "Autonvuokraus", cs: "Půjčení auta", hu: "Autóbérlés", ro: "Închiriere auto", ar: "تأجير سيارات" } },
  beaches: { href: "/beaches", label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες", it: "Spiagge", nl: "Stranden", pl: "Plaże", es: "Playas", pt: "Praias", ru: "Пляжи", ja: "ビーチ", ko: "해변", zh: "海滩", tr: "Plajlar", sv: "Stränder", da: "Strande", no: "Strender", fi: "Rannat", cs: "Pláže", hu: "Strandok", ro: "Plaje", ar: "شواطئ" } },
  explore: { href: "/explore", label: { en: "Explore", fr: "Explorer", de: "Entdecken", el: "Εξερεύνηση", it: "Esplora", nl: "Verkennen", pl: "Odkrywaj", es: "Explorar", pt: "Explorar", ru: "Карта", ja: "探索", ko: "탐색", zh: "探索", tr: "Keşfet", sv: "Utforska", da: "Udforsk", no: "Utforsk", fi: "Tutki", cs: "Objevuj", hu: "Felfedezés", ro: "Explorează", ar: "استكشف" } },
  villages: { href: "/villages", label: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά", it: "Villaggi", nl: "Dorpen", pl: "Wioski", es: "Pueblos", pt: "Aldeias", ru: "Деревни", ja: "村", ko: "마을", zh: "村庄", tr: "Köyler", sv: "Byar", da: "Landsbyer", no: "Landsbyer", fi: "Kylät", cs: "Vesnice", hu: "Falvak", ro: "Sate", ar: "قرى" } },
  food: { href: "/food", label: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό", it: "Ristoranti", nl: "Eten", pl: "Restauracje", es: "Comida", pt: "Comida", ru: "Еда", ja: "グルメ", ko: "맛집", zh: "美食", tr: "Yemek", sv: "Mat", da: "Mad", no: "Mat", fi: "Ruoka", cs: "Jídlo", hu: "Éttermek", ro: "Mâncare", ar: "طعام" } },
  hikes: { href: "/hikes", label: { en: "Hikes", fr: "Randos", de: "Wandern", el: "Πεζοπορία", it: "Escursioni", nl: "Wandelen", pl: "Szlaki", es: "Rutas", pt: "Trilhas", ru: "Походы", ja: "ハイキング", ko: "하이킹", zh: "徒步", tr: "Yürüyüş", sv: "Vandringar", da: "Vandreture", no: "Turer", fi: "Vaellukset", cs: "Túry", hu: "Túrák", ro: "Drumeții", ar: "مشي" } },
  news: { href: "/news", label: { en: "News", fr: "Actus", de: "Nachrichten", el: "Νέα", it: "Notizie", nl: "Nieuws", pl: "Wiadomości", es: "Noticias", pt: "Notícias", ru: "Новости", ja: "ニュース", ko: "뉴스", zh: "新闻", tr: "Haberler", sv: "Nyheter", da: "Nyheder", no: "Nyheter", fi: "Uutiset", cs: "Zprávy", hu: "Hírek", ro: "Știri", ar: "أخبار" } },
  events: { href: "/events", label: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις", it: "Eventi", nl: "Evenementen", pl: "Wydarzenia", es: "Eventos", pt: "Eventos", ru: "События", ja: "イベント", ko: "이벤트", zh: "活动", tr: "Etkinlikler", sv: "Evenemang", da: "Begivenheder", no: "Arrangementer", fi: "Tapahtumat", cs: "Události", hu: "Események", ro: "Evenimente", ar: "فعاليات" } },
  daily: { href: "/daily", label: { en: "Daily", fr: "Quotidien", de: "Täglich", el: "Καθημερινά", it: "Quotidiano", nl: "Dagelijks", pl: "Codziennie", es: "Diario", pt: "Diário", ru: "Ежедневно", ja: "デイリー", ko: "데일리", zh: "每日", tr: "Günlük", sv: "Dagligen", da: "Dagligt", no: "Daglig", fi: "Päivittäin", cs: "Denně", hu: "Napi", ro: "Zilnic", ar: "يومي" } },
  guides: { href: "/articles", label: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί", it: "Guide", nl: "Gidsen", pl: "Przewodniki", es: "Guías", pt: "Guias", ru: "Гиды", ja: "ガイド", ko: "가이드", zh: "指南", tr: "Rehber", sv: "Guider", da: "Guides", no: "Guider", fi: "Oppaat", cs: "Průvodce", hu: "Útmutatók", ro: "Ghiduri", ar: "أدلة" } },
  updates: { href: "/updates", label: { en: "Updates", fr: "Nouveautés", de: "Updates", el: "Νέα προϊόντος", it: "Novità", nl: "Updates", pl: "Nowości", es: "Novedades", pt: "Novidades", ru: "Обновления", ja: "更新", ko: "업데이트", zh: "更新", tr: "Yenilikler", sv: "Nyheter", da: "Nyheder", no: "Oppdateringer", fi: "Uutuudet", cs: "Novinky", hu: "Újdonságok", ro: "Noutăți", ar: "تحديثات" } },
};

const NAV_GROUPS: Array<{ key: string; label: NavLabel; items: NavLink[] }> = [
  {
    key: "plan",
    label: { en: "Plan", fr: "Planifier", de: "Planen", el: "Σχεδιασμός", it: "Pianifica", nl: "Plannen", pl: "Planuj", es: "Planificar", pt: "Planear", ru: "Спланировать", ja: "プラン", ko: "계획", zh: "规划", tr: "Planla", sv: "Planera", da: "Planlæg", no: "Planlegg", fi: "Suunnittele", cs: "Plánovat", hu: "Tervezés", ro: "Planifică", ar: "خطط" },
    items: [LINKS.buses, LINKS.live, LINKS.airports, LINKS.carRental, LINKS.weather, LINKS.nearMe],
  },
  {
    key: "discover",
    label: { en: "Discover", fr: "Découvrir", de: "Entdecken", el: "Ανακαλύψτε", it: "Scopri", nl: "Ontdekken", pl: "Odkrywaj", es: "Descubrir", pt: "Descobrir", ru: "Открыть", ja: "発見", ko: "발견", zh: "发现", tr: "Keşfet", sv: "Upptäck", da: "Opdag", no: "Oppdag", fi: "Löydä", cs: "Objevit", hu: "Felfedezés", ro: "Descoperă", ar: "اكتشف" },
    items: [LINKS.beaches, LINKS.explore, LINKS.villages, LINKS.food, LINKS.hikes],
  },
  {
    key: "today",
    label: { en: "Today", fr: "Aujourd'hui", de: "Heute", el: "Σήμερα", it: "Oggi", nl: "Vandaag", pl: "Dzisiaj", es: "Hoy", pt: "Hoje", ru: "Сегодня", ja: "今日", ko: "오늘", zh: "今天", tr: "Bugün", sv: "Idag", da: "I dag", no: "I dag", fi: "Tänään", cs: "Dnes", hu: "Ma", ro: "Azi", ar: "اليوم" },
    items: [LINKS.news, LINKS.events, LINKS.daily, LINKS.guides, LINKS.updates],
  },
];

const navLabel = (l: NavLabel, locale: string) => l[locale] || l.en;

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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:bg-surface hover:text-text transition-all"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
      </button>

      {langOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 max-h-80 overflow-y-auto bg-white rounded-xl border border-border shadow-card z-50">
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
                    ? "bg-sea/8 text-sea font-semibold"
                    : "text-text-muted hover:bg-surface hover:text-text"
                }`}
              >
                <span>{l.name}</span>
                <span className="text-[10px] font-data text-text-light">{l.label}</span>
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
  const [open, setOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menus on route change, intentional sync from pathname
    setOpen(false);
    setMobileLangOpen(false);
  }, [pathname]);

  const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <nav className="sticky top-3.5 z-50 mx-auto max-w-6xl px-4">
      <div className="flex items-center justify-between rounded-full bg-white/88 backdrop-blur-xl px-3.5 py-2.5 pl-5 shadow-[0_8px_30px_rgba(11,94,120,.14)]">
        {/* Logo : wordmark dessine */}
        <Link href="/" className="flex items-center" aria-label="cretedirect home">
          <Wordmark width={128} />
        </Link>

        {/* Desktop nav : 3 univers en dropdown (CSS hover/focus, zero JS) */}
        <div className="hidden md:flex items-center gap-2 text-[13px] font-semibold text-text-muted">
          {NAV_GROUPS.map((group) => {
            const groupActive = group.items.some((l) => pathname?.startsWith(l.href));
            return (
              <div key={group.key} className="relative group">
                <button
                  type="button"
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                    groupActive ? "bg-text text-white" : "hover:text-sea hover:bg-surface/60"
                  }`}
                >
                  {navLabel(group.label, locale)}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 absolute left-0 top-full pt-1 transition-all duration-150 z-50">
                  <div className="bg-white rounded-3xl border border-border shadow-card py-2 w-44">
                    {group.items.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-3.5 py-2 text-sm transition-colors ${
                          pathname?.startsWith(link.href)
                            ? "text-sea bg-sea/8 font-semibold"
                            : "text-text-muted hover:bg-surface hover:text-text"
                        }`}
                      >
                        {navLabel(link.label, locale)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: LIVE pill + search + locale dropdown + mobile hamburger */}
        <div className="flex items-center gap-2">
          <LivePill />
          <Link
            href="/search"
            aria-label="Search"
            className="p-2 text-text-muted hover:text-sea transition-colors"
          >
            <Search className="w-5 h-5" />
          </Link>
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} pathname={pathname} router={router} />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-text-muted hover:text-sea transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu : carte arrondie sous la pilule */}
      {open && (
        <div className="md:hidden mt-2 rounded-[28px] bg-white/96 backdrop-blur-xl shadow-[0_18px_50px_rgba(11,94,120,.18)]">
          <div className="px-4 py-4 space-y-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-light m-0">
                  {navLabel(group.label, locale)}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        pathname?.startsWith(link.href)
                          ? "bg-sea/8 text-sea"
                          : "text-text-muted hover:bg-surface hover:text-text"
                      }`}
                    >
                      {navLabel(link.label, locale)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Mobile locale switcher - collapsible */}
            <div className="pt-3 mt-2 border-t border-border">
              <button
                onClick={() => setMobileLangOpen(!mobileLangOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface transition-colors"
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
                          ? "bg-sea text-white shadow-soft"
                          : "text-text-muted bg-surface hover:bg-surface"
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
