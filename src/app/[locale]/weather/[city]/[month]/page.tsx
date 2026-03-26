import { CITIES, MONTHS, MONTH_NAMES, getClimateData, getCity, getSwimVerdict } from "@/lib/weather-monthly";
import type { Locale } from "@/lib/types";
import { Thermometer, Waves, Sun, CloudRain, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export function generateStaticParams() {
  const params: { city: string; month: string }[] = [];
  for (const city of CITIES) {
    for (const month of MONTHS) {
      params.push({ city: city.slug, month });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string; month: string }> }) {
  const { locale, city: citySlug, month } = await params;
  const city = getCity(citySlug);
  const monthName = MONTH_NAMES[locale]?.[month] || MONTH_NAMES.en[month];
  if (!city || !monthName) return { title: "Not found" };

  const climate = getClimateData(citySlug, month);

  const titles: Record<string, string> = {
    en: `Weather in ${city.name} in ${monthName} - Temperature, Sea & Sun | Crete Direct`,
    fr: `Météo à ${city.name} en ${monthName} - Température, Mer & Soleil | Crete Direct`,
    de: `Wetter in ${city.name} im ${monthName} - Temperatur, Meer & Sonne | Crete Direct`,
    el: `Καιρός στ${city.nameEl.startsWith("Η") || city.nameEl.startsWith("Ι") ? "ο" : "ην"} ${city.nameEl} τον ${monthName} | Crete Direct`,
  };

  const descs: Record<string, string> = {
    en: `${city.name} in ${monthName}: ${climate.avgHigh}°C average high, sea temperature ${climate.seaTemp}°C, ${climate.sunHours}h sunshine daily. Complete weather guide for your trip to Crete.`,
    fr: `${city.name} en ${monthName} : ${climate.avgHigh}°C en moyenne, mer à ${climate.seaTemp}°C, ${climate.sunHours}h de soleil/jour. Guide météo complet pour votre voyage en Crète.`,
    de: `${city.name} im ${monthName}: ${climate.avgHigh}°C Durchschnitt, Meer ${climate.seaTemp}°C, ${climate.sunHours}h Sonne täglich. Kompletter Wetterleitfaden für Kreta.`,
    el: `${city.nameEl} τον ${monthName}: ${climate.avgHigh}°C μέση θερμοκρασία, θάλασσα ${climate.seaTemp}°C, ${climate.sunHours} ώρες ήλιο. Οδηγός καιρού Κρήτης.`,
  };

  const url = `${BASE_URL}/${locale}/weather/${citySlug}/${month}`;

  return {
    title: titles[locale] || titles.en,
    description: descs[locale] || descs.en,
    alternates: { canonical: url },
    openGraph: { title: titles[locale] || titles.en, description: descs[locale] || descs.en, url },
  };
}

export default async function WeatherCityMonthPage({ params }: { params: Promise<{ locale: string; city: string; month: string }> }) {
  const { locale, city: citySlug, month } = await params;
  const loc = locale as Locale;
  const city = getCity(citySlug);
  const monthName = MONTH_NAMES[locale]?.[month] || MONTH_NAMES.en[month];

  if (!city || !monthName || !MONTHS.includes(month as typeof MONTHS[number])) notFound();

  const climate = getClimateData(citySlug, month);
  const swimVerdict = getSwimVerdict(climate.seaTemp, locale);

  const heroTitles: Record<string, string> = {
    en: `Weather in ${city.name} in ${monthName}`,
    fr: `Météo à ${city.name} en ${monthName}`,
    de: `Wetter in ${city.name} im ${monthName}`,
    el: `Καιρός στην ${city.nameEl} τον ${monthName}`,
  };

  const labels: Record<string, Record<string, string>> = {
    en: { avgHigh: "Average high", avgLow: "Average low", seaTemp: "Sea temperature", rain: "Rainy days", sun: "Daily sunshine", uv: "UV index", swim: "Swimming", allWeather: "All weather", otherMonths: "Other months", otherCities: "Other cities" },
    fr: { avgHigh: "Max. moyenne", avgLow: "Min. moyenne", seaTemp: "Température mer", rain: "Jours de pluie", sun: "Soleil quotidien", uv: "Indice UV", swim: "Baignade", allWeather: "Toute la météo", otherMonths: "Autres mois", otherCities: "Autres villes" },
    de: { avgHigh: "Durchschn. Höchst", avgLow: "Durchschn. Tiefst", seaTemp: "Meertemperatur", rain: "Regentage", sun: "Sonnenstunden", uv: "UV-Index", swim: "Schwimmen", allWeather: "Alles Wetter", otherMonths: "Andere Monate", otherCities: "Andere Städte" },
    el: { avgHigh: "Μέση μέγιστη", avgLow: "Μέση ελάχιστη", seaTemp: "Θερμ. θάλασσας", rain: "Βροχερές μέρες", sun: "Ώρες ηλιοφάνειας", uv: "Δείκτης UV", swim: "Κολύμβηση", allWeather: "Όλος ο καιρός", otherMonths: "Άλλοι μήνες", otherCities: "Άλλες πόλεις" },
  };

  const L = labels[locale] || labels.en;

  // FAQ data
  const faqItems = [
    {
      q: locale === "fr" ? `Quelle est la température à ${city.name} en ${monthName} ?` : locale === "de" ? `Wie warm ist es in ${city.name} im ${monthName}?` : `What is the temperature in ${city.name} in ${monthName}?`,
      a: locale === "fr" ? `En ${monthName}, ${city.name} a une température moyenne de ${climate.avgHigh}°C en journée et ${climate.avgLow}°C la nuit.` : locale === "de" ? `Im ${monthName} hat ${city.name} eine Durchschnittstemperatur von ${climate.avgHigh}°C tagsüber und ${climate.avgLow}°C nachts.` : `In ${monthName}, ${city.name} has an average daytime temperature of ${climate.avgHigh}°C and ${climate.avgLow}°C at night.`,
    },
    {
      q: locale === "fr" ? `Peut-on se baigner à ${city.name} en ${monthName} ?` : locale === "de" ? `Kann man in ${city.name} im ${monthName} schwimmen?` : `Can you swim in ${city.name} in ${monthName}?`,
      a: locale === "fr" ? `La température de la mer est de ${climate.seaTemp}°C en ${monthName}. ${swimVerdict}.` : locale === "de" ? `Die Meertemperatur beträgt ${climate.seaTemp}°C im ${monthName}. ${swimVerdict}.` : `Sea temperature is ${climate.seaTemp}°C in ${monthName}. ${swimVerdict}.`,
    },
    {
      q: locale === "fr" ? `Pleut-il beaucoup à ${city.name} en ${monthName} ?` : locale === "de" ? `Regnet es viel in ${city.name} im ${monthName}?` : `Does it rain much in ${city.name} in ${monthName}?`,
      a: locale === "fr" ? `${city.name} a en moyenne ${climate.rainyDays} jours de pluie en ${monthName}, avec ${climate.sunHours} heures de soleil par jour.` : locale === "de" ? `${city.name} hat durchschnittlich ${climate.rainyDays} Regentage im ${monthName}, mit ${climate.sunHours} Sonnenstunden pro Tag.` : `${city.name} averages ${climate.rainyDays} rainy days in ${monthName}, with ${climate.sunHours} hours of sunshine daily.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-aegean text-white py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href={`/${locale}/weather`} className="inline-flex items-center gap-1 text-white/50 text-sm hover:text-white/80 mb-4">
            <ChevronLeft className="w-4 h-4" /> {L.allWeather}
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {heroTitles[locale] || heroTitles.en}
          </h1>
          <p className="text-white/50 text-sm mt-2">{city.nameEl}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Climate stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <Thermometer className="w-6 h-6 text-terra mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.avgHigh}</p>
            <p className="text-3xl font-bold text-text">{climate.avgHigh}°C</p>
          </div>
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <Thermometer className="w-6 h-6 text-aegean mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.avgLow}</p>
            <p className="text-3xl font-bold text-text">{climate.avgLow}°C</p>
          </div>
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <Waves className="w-6 h-6 text-aegean mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.seaTemp}</p>
            <p className="text-3xl font-bold text-text">{climate.seaTemp}°C</p>
            <p className="text-xs text-olive mt-1">{swimVerdict}</p>
          </div>
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <CloudRain className="w-6 h-6 text-aegean mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.rain}</p>
            <p className="text-3xl font-bold text-text">{climate.rainyDays}</p>
          </div>
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <Sun className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.sun}</p>
            <p className="text-3xl font-bold text-text">{climate.sunHours}h</p>
          </div>
          <div className="rounded-xl bg-white border border-border p-5 text-center">
            <Sun className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-text-muted">{L.uv}</p>
            <p className="text-3xl font-bold text-text">{climate.uvIndex}</p>
          </div>
        </div>

        {/* FAQ section */}
        <section>
          <h2 className="text-xl font-bold text-aegean mb-4">FAQ</h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-text mb-2">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Other months for this city */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{L.otherMonths}</h3>
          <div className="flex flex-wrap gap-2">
            {MONTHS.map(m => (
              <Link
                key={m}
                href={`/${locale}/weather/${citySlug}/${m}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${m === month ? "bg-aegean text-white" : "bg-white border border-border text-text-muted hover:bg-aegean-faint hover:text-aegean"}`}
              >
                {(MONTH_NAMES[locale]?.[m] || MONTH_NAMES.en[m]).substring(0, 3)}
              </Link>
            ))}
          </div>
        </section>

        {/* Other cities for this month */}
        <section>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{L.otherCities}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CITIES.filter(c => c.slug !== citySlug).map(c => {
              const cl = getClimateData(c.slug, month);
              return (
                <Link
                  key={c.slug}
                  href={`/${locale}/weather/${c.slug}/${month}`}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-border hover:border-aegean/30 transition-colors"
                >
                  <span className="text-sm font-medium text-text">{c.name}</span>
                  <span className="text-sm font-bold text-terra">{cl.avgHigh}°</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
