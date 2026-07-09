import { setRequestLocale } from "next-intl/server";
import { getAllCbPlacesSlim, packCbPlaces, EMPTY_PACKED_PLACES } from "@/lib/cb-places";
import { getAffiliatePlaces } from "@/lib/affiliate-places";
import { buildAlternates } from "@/lib/seo";
import { ExploreView } from "@/components/explore/ExploreView";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Crete Explorer - Every Beach, Gorge, Cave & Village on the Map",
    desc: "Interactive explorer of Crete: hundreds of beaches, gorges, caves, monasteries, islands and villages with photos, ratings and detailed info. Filter by sand type, water color, crowds and more.",
  },
  fr: {
    title: "Explorateur de Crète - Plages, Gorges, Grottes & Villages sur la Carte",
    desc: "Explorateur interactif de la Crète : des centaines de plages, gorges, grottes, monastères, îles et villages avec photos, notes et infos détaillées. Filtrez par type de sable, couleur de l'eau, affluence.",
  },
  de: {
    title: "Kreta Explorer - Jeder Strand, jede Schlucht & jedes Dorf auf der Karte",
    desc: "Interaktiver Kreta-Explorer: Hunderte Strände, Schluchten, Höhlen, Klöster, Inseln und Dörfer mit Fotos, Bewertungen und Details. Filtern nach Sandtyp, Wasserfarbe, Andrang.",
  },
  el: {
    title: "Εξερευνητής Κρήτης - Κάθε Παραλία, Φαράγγι & Χωριό στον Χάρτη",
    desc: "Διαδραστικός εξερευνητής της Κρήτης: εκατοντάδες παραλίες, φαράγγια, σπήλαια, μοναστήρια, νησιά και χωριά με φωτογραφίες, βαθμολογίες και λεπτομέρειες.",
  },
  it: {
    title: "Esploratore di Creta - Ogni Spiaggia, Gola & Villaggio sulla Mappa",
    desc: "Esploratore interattivo di Creta: centinaia di spiagge, gole, grotte, monasteri, isole e villaggi con foto, valutazioni e informazioni dettagliate. Filtra per tipo di sabbia, colore dell'acqua, affollamento.",
  },
  nl: {
    title: "Kreta Verkenner - Elk Strand, Kloof & Dorp op de Kaart",
    desc: "Interactieve verkenner van Kreta: honderden stranden, kloven, grotten, kloosters, eilanden en dorpen met foto's, beoordelingen en gedetailleerde informatie. Filter op zandtype, waterkleur, drukte.",
  },
  pl: {
    title: "Odkrywca Krety - Każda Plaża, Wąwóz & Wioska na Mapie",
    desc: "Interaktywny odkrywca Krety: setki plaż, wąwozów, jaskiń, klasztorów, wysp i wiosek ze zdjęciami, ocenami i szczegółowymi informacjami. Filtruj według rodzaju piasku, koloru wody, tłoku.",
  },
  es: {
    title: "Explorador de Creta - Cada Playa, Garganta & Pueblo en el Mapa",
    desc: "Explorador interactivo de Creta: cientos de playas, gargantas, cuevas, monasterios, islas y pueblos con fotos, valoraciones e información detallada. Filtra por tipo de arena, color del agua, afluencia.",
  },
  pt: {
    title: "Explorador de Creta - Cada Praia, Desfiladeiro & Aldeia no Mapa",
    desc: "Explorador interativo de Creta: centenas de praias, desfiladeiros, grutas, mosteiros, ilhas e aldeias com fotos, avaliações e informações detalhadas. Filtre por tipo de areia, cor da água, movimento.",
  },
  ru: {
    title: "Путеводитель по Криту - Каждый Пляж, Ущелье & Деревня на Карте",
    desc: "Интерактивный путеводитель по Криту: сотни пляжей, ущелий, пещер, монастырей, островов и деревень с фото, рейтингами и подробной информацией. Фильтр по типу песка, цвету воды, людности.",
  },
  ja: {
    title: "クレタ島エクスプローラー - 地図上のすべてのビーチ、渓谷＆村",
    desc: "クレタ島のインタラクティブな探索ツール：数百のビーチ、渓谷、洞窟、修道院、島々、村を写真・評価・詳細情報付きで紹介。砂のタイプ、水の色、混雑度でフィルタリング。",
  },
  ko: {
    title: "크레타 탐험기 - 지도에서 모든 해변, 협곡 & 마을",
    desc: "크레타 인터랙티브 탐험기: 수백 개의 해변, 협곡, 동굴, 수도원, 섬, 마을을 사진, 평점, 상세 정보와 함께. 모래 유형, 물 색깔, 혼잡도로 필터링.",
  },
  zh: {
    title: "克里特岛探索 - 地图上的每一片海滩、峡谷与村庄",
    desc: "克里特岛互动探索器：数百个海滩、峡谷、洞穴、修道院、岛屿和村庄，附有照片、评分和详细信息。按沙滩类型、水色、人流量筛选。",
  },
  tr: {
    title: "Girit Kaşifi - Haritada Her Sahil, Kanyon & Köy",
    desc: "Girit'in interaktif kaşifi: fotoğraflar, puanlar ve ayrıntılı bilgilerle yüzlerce sahil, kanyon, mağara, manastır, ada ve köy. Kum tipine, su rengine, kalabalığa göre filtreleyin.",
  },
  sv: {
    title: "Kreta Explorer - Varje Strand, Ravin & By på Kartan",
    desc: "Interaktiv utforskare av Kreta: hundratals stränder, raviner, grottor, kloster, öar och byar med foton, betyg och detaljerad information. Filtrera efter sandtyp, vattenfärg, trängsel.",
  },
  da: {
    title: "Kreta Opdager - Hver Strand, Kløft & Landsby på Kortet",
    desc: "Interaktiv opdager af Kreta: hundredvis af strande, kløfter, huler, klostre, øer og landsbyer med fotos, bedømmelser og detaljerede oplysninger. Filtrer efter sandtype, vandfarve, trængsel.",
  },
  no: {
    title: "Kreta Utforsker - Hver Strand, Kløft & Landsby på Kartet",
    desc: "Interaktiv utforsker av Kreta: hundrevis av strender, kløfter, huler, klostre, øyer og landsbyer med bilder, rangeringer og detaljert informasjon. Filtrer etter sandtype, vannfarge, folkemengde.",
  },
  fi: {
    title: "Kreeta Explorer - Jokainen Ranta, Rotko & Kylä Kartalla",
    desc: "Interaktiivinen Kreetan tutkija: satoja rantoja, rotkoja, luolia, luostareita, saaria ja kyliä valokuvineen, arvosteluineen ja yksityiskohtaisine tietoineen. Suodata hiekkatyypin, vedenväriin, tungoksen mukaan.",
  },
  cs: {
    title: "Průzkumník Kréty - Každá Pláž, Soutěska & Vesnice na Mapě",
    desc: "Interaktivní průzkumník Kréty: stovky pláží, soutěsek, jeskyní, klášterů, ostrovů a vesnic s fotografiemi, hodnoceními a podrobnými informacemi. Filtrujte podle typu písku, barvy vody, návštěvnosti.",
  },
  hu: {
    title: "Kréta Felfedező - Minden Strand, Szakadék & Falu a Térképen",
    desc: "Kréta interaktív felfedezője: több száz strand, szakadék, barlang, kolostor, sziget és falu fotókkal, értékelésekkel és részletes információkkal. Szűrje homok típus, vízszín, tömeg szerint.",
  },
  ro: {
    title: "Exploratorul Cretei - Fiecare Plajă, Chei & Sat pe Hartă",
    desc: "Exploratorul interactiv al Cretei: sute de plaje, chei, peșteri, mănăstiri, insule și sate cu fotografii, evaluări și informații detaliate. Filtrați după tipul de nisip, culoarea apei, aglomerație.",
  },
  ar: {
    title: "مستكشف كريت - كل شاطئ ووادٍ وقرية على الخريطة",
    desc: "مستكشف تفاعلي لجزيرة كريت: مئات الشواطئ والأودية والكهوف والأديرة والجزر والقرى مع الصور والتقييمات والمعلومات التفصيلية. صفّح حسب نوع الرمل ولون الماء والازدحام.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  const ogImage = `${BASE_URL}/api/og?title=${encodeURIComponent(m.title)}`;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/explore"),
    openGraph: {
      type: "website",
      siteName: "Crete Direct",
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/explore`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.desc,
      images: [ogImage],
    },
  };
}

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // packCbPlaces : tuples + tables de dédup → divise le poids du flight RSC
  // (clés JSON répétées, water_quality dupliqués, préfixe photo commun).
  const [places, affiliatePlaces] = await Promise.all([
    getAllCbPlacesSlim().then(packCbPlaces).catch(() => EMPTY_PACKED_PLACES),
    getAffiliatePlaces().catch(() => []),
  ]);

  const m = META[locale] || META.en;
  const pageUrl = `${BASE_URL}/${locale}/explore`;
  // Rendered as a real <script> (not Next `other` meta) so Google parses it as
  // structured data. CollectionPage describes the explorer; BreadcrumbList gives
  // Home > Explore for the SERP breadcrumb.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": pageUrl,
        name: m.title,
        description: m.desc,
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        about: { "@type": "Place", name: "Crete, Greece" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Crete Direct", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: m.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ExploreView places={places} affiliatePlaces={affiliatePlaces} locale={locale} />
    </main>
  );
}
