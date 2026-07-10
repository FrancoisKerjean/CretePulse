// src/components/InstallBanner.tsx — lot 1 app compagnon.
// Bannière d'installation PWA contextuelle + events de mesure du lot 0.
// Gates : mobile, non-standalone, pages outils, 15s de présence, dismiss 14j.
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const HIDE_KEY = "cd_install_hidden"; // timestamp ms du dismiss
const HIDE_DAYS = 14;
const SHOW_DELAY_MS = 15_000;
const TOOL_PAGES = /\/(buses|explore|live|beaches)(\/|$)/;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const t = useTranslations("installBanner");
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"native" | "ios_hint">("ios_hint");
  const [showIosSteps, setShowIosSteps] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  // Capte beforeinstallprompt (Chrome/Android) dès que possible, page entière.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setMode("native");
    };
    const onInstalled = () => {
      window.plausible?.("pwa_installed");
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Gates + timer d'affichage.
  useEffect(() => {
    setVisible(false);
    setShowIosSteps(false);
    try {
      if (!TOOL_PAGES.test(pathname ?? "")) return;
      if (isStandalone()) return;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      if (!coarse) return;
      const hidden = Number(localStorage.getItem(HIDE_KEY) || 0);
      if (hidden && Date.now() - hidden < HIDE_DAYS * 24 * 60 * 60 * 1000) return;
      const isiOS = /iP(hone|ad|od)/.test(navigator.userAgent);
      // Android sans beforeinstallprompt (déjà installée ou non éligible) : rien.
      const timer = setTimeout(() => {
        if (!isiOS && !deferred.current) return;
        setVisible(true);
        window.plausible?.("install_banner_shown", {
          props: { mode: deferred.current ? "native" : "ios_hint" },
        });
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    } catch {
      return;
    }
  }, [pathname]);

  function dismiss() {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now()));
    } catch {}
    window.plausible?.("install_banner_dismiss");
    setVisible(false);
  }

  async function install() {
    window.plausible?.("install_banner_click", { props: { mode } });
    if (deferred.current) {
      const p = deferred.current;
      deferred.current = null;
      await p.prompt();
      setVisible(false);
    } else {
      setShowIosSteps(true); // iOS : pas d'API, on montre le geste Partager
    }
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border-2 border-ink bg-white p-3 shadow-lg md:hidden">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="m-0 font-heading text-sm font-bold text-ink">{t("title")}</p>
          <p className="m-0 text-xs text-text-muted">{showIosSteps ? t("ios") : t("body")}</p>
        </div>
        {!showIosSteps && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-xl border-2 border-ink bg-warn px-3 py-2 font-heading text-xs font-bold text-ink"
          >
            {t("cta")}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("later")}
          className="shrink-0 p-1 text-text-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
