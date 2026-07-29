// Releve hebdomadaire de la note Google des loueurs ACTIFS.
//
// Une note bouge lentement : une passe par semaine suffit, et le volume reste
// dans le quota gratuit de Places API (une dizaine de loueurs actifs, une
// requete chacun). Les prospects non actifs ne sont pas releves ici : ils sont
// des dizaines et ne recoivent aucune demande. Le bouton du back-office permet
// d en relever un a la main.
//
// Sans GOOGLE_PLACES_API_KEY la passe ne touche a rien et se declare desarmee.
import { NextRequest, NextResponse } from "next/server";
import { refreshStaleRatings } from "@/lib/google-rating-server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await refreshStaleRatings();
  if (res.disabled) return NextResponse.json({ ok: true, disabled: true });

  console.log("[cron/google-ratings] passe terminee", res);
  return NextResponse.json({ ok: true, ...res });
}
