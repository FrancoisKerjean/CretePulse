// Parse une durée KTEL texte ("2h 30min", "1h45", "20min", "1h") en minutes.
// null si vide ou illisible. Pur, zéro I/O.
export function parseDurationMin(s: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase().replace(/\s+/g, "");
  const hm = t.match(/^(\d+)h(\d+)?(?:min)?$/); // 2h30 / 2h30min / 1h
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  const mm = t.match(/^(\d+)min$/); // 45min
  if (mm) return parseInt(mm[1], 10);
  return null;
}
