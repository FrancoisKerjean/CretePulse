// src/components/OfflineNotice.tsx : bandeau « hors ligne » des pages bus (lot 1 PWA,
// 27/10/2026). Avant, une page servie depuis le cache ne disait pas qu'elle datait : le
// voyageur lisait des horaires de huit jours comme s'ils étaient frais, et le live
// (NowPanel, DepartureBoard) échouait en silence. Rendu nul tant que le réseau est là.
"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const T: Record<string, Record<string, string>> = {
  title: {
    en: "You are offline", fr: "Vous êtes hors ligne", de: "Sie sind offline", el: "Είστε εκτός σύνδεσης",
  },
  body: {
    en: "Timetables shown are the ones saved on {date}. Live departures are unavailable until you have signal.",
    fr: "Les horaires affichés sont ceux enregistrés le {date}. Les passages en direct reviendront avec le réseau.",
    de: "Die angezeigten Fahrpläne wurden am {date} gespeichert. Live-Abfahrten gibt es erst wieder mit Empfang.",
    el: "Τα δρομολόγια που βλέπετε αποθηκεύτηκαν στις {date}. Οι ζωντανές αναχωρήσεις θα επανέλθουν με σήμα.",
  },
  bodyNoDate: {
    en: "Timetables shown were saved earlier. Live departures are unavailable until you have signal.",
    fr: "Les horaires affichés ont été enregistrés plus tôt. Les passages en direct reviendront avec le réseau.",
    de: "Die angezeigten Fahrpläne wurden früher gespeichert. Live-Abfahrten gibt es erst wieder mit Empfang.",
    el: "Τα δρομολόγια που βλέπετε αποθηκεύτηκαν νωρίτερα. Οι ζωντανές αναχωρήσεις θα επανέλθουν με σήμα.",
  },
};

export function OfflineNotice({ locale, updatedAt }: { locale: string; updatedAt: string | null }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  const tr = (m: Record<string, string>) => m[locale] ?? m.en;
  const body = updatedAt
    ? tr(T.body).replace("{date}", new Date(updatedAt).toLocaleDateString(locale))
    : tr(T.bodyNoDate);
  return (
    <div
      role="status"
      data-testid="offline-notice"
      className="mb-4 flex items-start gap-3 rounded-[20px] border border-amber-300 bg-amber-50 px-4 py-3"
    >
      <WifiOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div>
        <p className="font-heading font-bold text-sm text-amber-900 m-0">{tr(T.title)}</p>
        <p className="text-xs text-amber-900/80 m-0 mt-0.5 leading-snug">{body}</p>
      </div>
    </div>
  );
}
