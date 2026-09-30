// Index des lieux de la recherche interne : [nom, slug, place_type] pour chaque fiche
// cb_places. Chargé par /search à la première frappe, régénéré une fois par jour.
// Avant le 30/09/2026 la recherche ne connaissait qu'une liste figée de rubriques :
// 83 % des requêtes, presque toutes des noms de lieux, revenaient vides.
import { NextResponse } from "next/server";
import { getAllCbPlacesSlim } from "@/lib/cb-places";
import type { PlaceIndexRow } from "@/lib/place-search";

export const revalidate = 86400;

export async function GET() {
  // Une erreur de lecture lève : Next ne met pas en cache une génération ratée et
  // continue de servir l'index précédent.
  const places = await getAllCbPlacesSlim();
  const rows: PlaceIndexRow[] = places.map((p) => [p.name, p.slug, p.place_type]);
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
