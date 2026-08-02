// src/app/api/cron/car-partner-nudge/route.ts
// Relance horaire des loueurs muets, à H+2, dans les heures ouvrables grecques.
//
// Pourquoi cette route existe alors que `cron/car-relance` relançait déjà les
// loueurs : elle ne tourne qu'à 9h00. Une demande déposée à 10h du matin voyait
// donc sa relance partir 23 h plus tard.
//
// Mesure du 01/08/2026 sur 30 jours (22 demandes) : la première offre arrive en
// <= 0,5 h sur TOUTES les issues où le client reste dans le jeu, et en 6,7 h sur
// les 8 demandes où il disparaît sans jamais trancher. La bataille se joue dans
// les deux premières heures, pas le lendemain matin.
//
// Le volume de courrier envoyé aux loueurs ne bouge pas : le plafond d'UNE
// relance par invite est inchangé, seul le moment change.
import { NextRequest, NextResponse } from "next/server";
import { isPartnerNudgeHour } from "@/lib/car-quotes";
import { runPartnerNudgePass } from "@/lib/car-partner-nudge-server";
import { assertCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;

  const now = Date.now();
  // Hors fenêtre, on ne fait rien et on ne consomme pas les relances : une
  // demande de nuit garde son ancienneté et part dès l'ouverture.
  if (!isPartnerNudgeHour(now)) {
    return NextResponse.json({ ok: true, skipped: "outside_window", partnersRelanced: 0 });
  }

  const { partnersRelanced } = await runPartnerNudgePass(now);
  return NextResponse.json({ ok: true, partnersRelanced });
}
