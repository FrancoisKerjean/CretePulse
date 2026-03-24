import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-sky text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t("hero")}
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Weather */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">{t("weatherNow")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["Heraklion", "Chania", "Rethymno", "Agios Nikolaos", "Ierapetra"].map((city) => (
            <div key={city} className="bg-white rounded-xl p-4 border border-border text-center">
              <p className="font-semibold text-sm">{city}</p>
              <p className="text-3xl font-bold text-sky mt-1">--°</p>
              <p className="text-xs text-text-muted mt-1">Loading...</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="max-w-6xl mx-auto px-4 py-12 border-t border-border">
        <h2 className="text-2xl font-bold mb-6">{t("eventsThisWeek")}</h2>
        <p className="text-text-muted">Coming soon</p>
      </section>

      {/* Newsletter */}
      <section className="bg-sand py-12 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold">{t("newsletter")}</h2>
          <p className="text-text-muted mt-2">{t("newsletterCta")}</p>
          <form className="mt-6 flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-white text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-terra text-white rounded-lg font-semibold text-sm hover:bg-terra/90 transition-colors"
            >
              {t("subscribe")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
