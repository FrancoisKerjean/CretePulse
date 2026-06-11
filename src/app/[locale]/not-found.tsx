import Link from "next/link";
import { getLocale } from "next-intl/server";
import { KriKri } from "@/components/KriKri";

const LOST: Record<string, string> = {
  en: "Oops, lost!",
  fr: "Oups, perdue !",
  de: "Hoppla, verlaufen!",
  el: "Ωχ, χαθήκαμε!",
};

export default async function NotFound() {
  const locale = await getLocale().catch(() => "en");
  const lost = LOST[locale] ?? LOST.en;

  return (
    <main className="min-h-[60vh] flex items-center justify-center bg-surface px-4">
      <div className="text-center max-w-md">
        <KriKri mood="lost" className="w-28 h-24 mx-auto" />
        <p className="font-heading text-7xl font-bold text-aegean/20 mb-2 font-data">404</p>
        <h1 className="font-heading text-2xl font-bold text-text mb-3">{lost}</h1>
        <p className="text-text-muted mb-8">The page you are looking for does not exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-sun text-text rounded-full font-heading font-bold text-sm hover:brightness-105 transition-all">
            Home
          </Link>
          <Link href="/beaches" className="px-6 py-3 bg-white text-aegean border border-aegean/20 rounded-full font-heading font-bold text-sm hover:bg-aegean-faint transition-colors">
            Beaches
          </Link>
          <Link href="/events" className="px-6 py-3 bg-white text-terra border border-terra/20 rounded-full font-heading font-bold text-sm hover:bg-terra-faint transition-colors">
            Events
          </Link>
        </div>
      </div>
    </main>
  );
}
