"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-extrabold text-lg text-aegean tracking-tight">CRETE</span>
              <span className="w-2 h-2 rounded-full bg-terra" />
              <span className="font-extrabold text-lg text-terra tracking-tight">DIRECT</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-sm">
              {t("about")}
            </p>
            <p className="text-xs text-text-light mt-3">{t("tagline")}</p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">{t("explore_heading")}</h4>
            <div className="space-y-2">
              <Link href="/beaches" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("beaches")}</Link>
              <Link href="/villages" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("villages")}</Link>
              <Link href="/food" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("food")}</Link>
              <Link href="/hikes" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("hikes")}</Link>
              <Link href="/weather" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("weather")}</Link>
              <Link href="/property-management" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("propertyManagement")}</Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Info</h4>
            <div className="space-y-2">
              <Link href="/about" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("about_link")}</Link>
              <Link href="/privacy" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("privacy")}</Link>
              <Link href="/buses" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("buses")}</Link>
              <Link href="/submit-event" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("submitEvent")}</Link>
              <a href="mailto:hello@crete.direct" className="block text-sm text-text-muted hover:text-aegean transition-colors">{t("contact")}</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-text-light">
            &copy; {new Date().getFullYear()} Crete Direct. {t("rights")}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-text-light">
            <MapPin className="w-3 h-3" />
            <span>{t("madeIn")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
