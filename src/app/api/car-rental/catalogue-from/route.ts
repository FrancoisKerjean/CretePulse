import { NextResponse } from "next/server";
import {
  CAR_CATEGORIES,
  MAX_CATALOGUE_DAYS,
  catalogueQuote,
  fromPricePerDay,
  isCatalogueEligible,
  isoToUtc,
  type CarCategory,
} from "@/lib/car-catalogue";
import { liveCataloguesForPartners, partnersForZoneWithTerms } from "@/lib/car-catalogue-db";
import { zoneForPickup } from "@/lib/car-partners";
import { meetsMinDays, rentalDays } from "@/lib/car-pricing";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const CACHE = { "Cache-Control": "private, max-age=300" };
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

/**
 * Par catégorie, pour ce retrait et ces dates, parmi les loueurs réservables :
 * - `prices` : le prix par jour le plus bas (« dès X €/jour ») ;
 * - `totals` : le total le plus bas, calculé comme l'offre qui sera envoyée
 *   (somme jour par jour + livraison au point de prise, `catalogueQuote`).
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const pickup = q.get("pickup") ?? "";
  const dateFrom = q.get("dateFrom") ?? "";
  const dateTo = q.get("dateTo") ?? "";
  const timeFrom = q.get("timeFrom") || null;
  const timeTo = q.get("timeTo") || null;

  // Validation stricte avant toute lecture en base : la route est publique.
  const zone = zoneForPickup(pickup);
  if (!zone) return bad("Unknown pickup point.");
  const from = isoToUtc(dateFrom);
  const to = isoToUtc(dateTo);
  if (from == null || to == null) return bad("Invalid dates (YYYY-MM-DD expected).");
  if (to < from) return bad("The end date is before the start date.");
  if ((to - from) / 86_400_000 > MAX_CATALOGUE_DAYS) return bad(`Rental too long (${MAX_CATALOGUE_DAYS} days maximum).`);
  if ((timeFrom && !TIME.test(timeFrom)) || (timeTo && !TIME.test(timeTo))) return bad("Invalid time (HH:MM expected).");

  if (process.env.CAR_CATALOGUE_ENABLED !== "on") return NextResponse.json({ prices: {}, totals: {} }, { headers: CACHE });

  const days = rentalDays(dateFrom, dateTo, timeFrom, timeTo);
  const partners = (await partnersForZoneWithTerms(zone.id)).filter(
    (p) => isCatalogueEligible(p) && meetsMinDays(p.min_days, days),
  );
  const catalogues = await liveCataloguesForPartners(partners.map((p) => p.id));

  const prices: Partial<Record<CarCategory, number>> = {};
  const totals: Partial<Record<CarCategory, number>> = {};
  for (const p of partners) {
    const cat = catalogues.get(p.id);
    if (!cat) continue;
    for (const c of CAR_CATEGORIES) {
      const v = fromPricePerDay(cat.rates, { dateFrom, dateTo, timeFrom, timeTo }, c);
      if (v != null && (prices[c] == null || v < prices[c]!)) prices[c] = v;
      const q = catalogueQuote(cat.rates, cat.conditions, { category: c, pickupSlug: pickup, dateFrom, dateTo, timeFrom, timeTo });
      if (q && (totals[c] == null || q.total < totals[c]!)) totals[c] = q.total;
    }
  }
  return NextResponse.json({ prices, totals }, { headers: CACHE });
}
