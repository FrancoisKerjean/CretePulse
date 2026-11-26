import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { partnerByPortalToken, ratesForPartner } from "@/lib/car-catalogue-db";
import { CAR_TERMS_VERSION, isPartnerBookable } from "@/lib/car-catalogue";
import { todayAthens } from "@/lib/car-partner-identity";
import { PortalForm } from "./PortalForm";

// Lien privé par loueur : jamais mis en cache (aucune écriture ISR), jamais indexé.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 860, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;

// Portail du loueur : identité de facturation, grille de prix 2027, conditions.
export default async function CarRatesPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  // Anglais seulement : les loueurs sont des pros locaux, une seule version à tenir.
  if (locale !== "en") redirect(`/en/car-rates/${token}`);
  setRequestLocale(locale);

  const partner = await partnerByPortalToken(token);
  if (!partner) notFound();
  const rates = await ratesForPartner(partner.id);

  return (
    <main style={shell}>
      <PortalForm
        token={token}
        partnerName={partner.name}
        identity={{
          legal_name: partner.legal_name ?? "", legal_form: partner.legal_form ?? "",
          address_line: partner.address_line ?? "", postal_code: partner.postal_code ?? "",
          city: partner.city ?? "", country: partner.country ?? "", vat_id: partner.vat_id ?? "",
        }}
        initialRates={rates.map((r) => ({
          category: r.category, period_from: r.period_from, period_to: r.period_to,
          min_days: String(r.min_days), eur_per_day: String(r.eur_per_day), source: r.source ?? "",
        }))}
        initialConditions={partner.catalogue_conditions ?? {}}
        status={partner.rates_status}
        suspended={partner.rates_status === "paused"}
        fleetFullUntil={partner.rates_paused_until && partner.rates_paused_until >= todayAthens() ? partner.rates_paused_until : null}
        termsAccepted={isPartnerBookable(partner)}
        termsVersion={CAR_TERMS_VERSION}
      />
    </main>
  );
}
