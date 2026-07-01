import type { Beach } from "./types";

type NearBeach = Beach & { dist: number };

type Ctx = {
  villageName: string;
  villageLocativeEl?: string;
  nearestName: string;
  nearestType: Beach["type"];
  nearestDist: number;
  total: number;
  minDist: number;
  maxDist: number;
  sand: number;
  pebble: number;
  rock: number;
  mixed: number;
  kids: number;
  taverna: number;
};

// Data-driven insight for /beaches/near/[village]. Zero fabrication —
// every number aggregates the 12 nearest beaches. Matches the /airbnb
// and /weather callout pattern: anchor sentence (nearest beach as the
// concrete reference) + mix sentence (composition breakdown that
// speaks to practical planning: type mix, kid-friendly count).

const TYPE_LABEL: Record<string, Record<Beach["type"], string>> = {
  en: { sand: "sandy", pebble: "pebble", rock: "rock", mixed: "mixed" },
  fr: { sand: "de sable", pebble: "de galets", rock: "rocheuse", mixed: "mixte" },
  de: { sand: "Sandstrand", pebble: "Kieselstrand", rock: "Felsstrand", mixed: "gemischt" },
  el: { sand: "αμμώδης", pebble: "με βότσαλα", rock: "βραχώδης", mixed: "μικτή" },
};

function typeLabel(type: Beach["type"], locale: string): string {
  return (TYPE_LABEL[locale] || TYPE_LABEL.en)[type] || type;
}

function en(c: Ctx): string {
  const s1 = c.nearestDist < 3
    ? `${c.villageName}'s closest beach is ${c.nearestName} — a ${typeLabel(c.nearestType, "en")} beach just ${c.nearestDist.toFixed(1)} km away, within easy walking or cycling distance.`
    : c.nearestDist < 10
    ? `${c.villageName}'s closest beach is ${c.nearestName} — a ${typeLabel(c.nearestType, "en")} beach ${c.nearestDist.toFixed(1)} km away, a short drive.`
    : `The closest beach to ${c.villageName} is ${c.nearestName}, a ${typeLabel(c.nearestType, "en")} beach ${c.nearestDist.toFixed(1)} km away.`;

  const parts: string[] = [];
  if (c.sand) parts.push(`${c.sand} sand`);
  if (c.pebble) parts.push(`${c.pebble} pebble`);
  if (c.rock) parts.push(`${c.rock} rock`);
  if (c.mixed) parts.push(`${c.mixed} mixed`);
  const mix = parts.join(", ");
  const extras: string[] = [];
  if (c.kids) extras.push(`${c.kids} family-friendly`);
  if (c.taverna) extras.push(`${c.taverna} with a taverna`);
  const extra = extras.length ? `; ${extras.join(", ")}.` : ".";
  const s2 = `Among the ${c.total} nearest beaches (up to ${c.maxDist.toFixed(0)} km): ${mix}${extra}`;
  return `${s1} ${s2}`;
}

function fr(c: Ctx): string {
  const s1 = c.nearestDist < 3
    ? `La plage la plus proche de ${c.villageName} est ${c.nearestName} — une plage ${typeLabel(c.nearestType, "fr")}, à seulement ${c.nearestDist.toFixed(1)} km, accessible à pied ou à vélo.`
    : c.nearestDist < 10
    ? `La plage la plus proche de ${c.villageName} est ${c.nearestName} — une plage ${typeLabel(c.nearestType, "fr")}, à ${c.nearestDist.toFixed(1)} km, quelques minutes en voiture.`
    : `La plage la plus proche de ${c.villageName} est ${c.nearestName}, une plage ${typeLabel(c.nearestType, "fr")} située à ${c.nearestDist.toFixed(1)} km.`;

  const parts: string[] = [];
  if (c.sand) parts.push(`${c.sand} de sable`);
  if (c.pebble) parts.push(`${c.pebble} de galets`);
  if (c.rock) parts.push(`${c.rock} rocheuse${c.rock > 1 ? "s" : ""}`);
  if (c.mixed) parts.push(`${c.mixed} mixte${c.mixed > 1 ? "s" : ""}`);
  const mix = parts.join(", ");
  const extras: string[] = [];
  if (c.kids) extras.push(`${c.kids} adaptée${c.kids > 1 ? "s" : ""} aux enfants`);
  if (c.taverna) extras.push(`${c.taverna} avec taverne`);
  const extra = extras.length ? ` ; ${extras.join(", ")}.` : ".";
  const s2 = `Parmi les ${c.total} plages les plus proches (jusqu'à ${c.maxDist.toFixed(0)} km) : ${mix}${extra}`;
  return `${s1} ${s2}`;
}

function de(c: Ctx): string {
  const s1 = c.nearestDist < 3
    ? `Der nächste Strand von ${c.villageName} ist ${c.nearestName} — ein ${typeLabel(c.nearestType, "de")}, nur ${c.nearestDist.toFixed(1)} km entfernt und bequem zu Fuß oder mit dem Rad erreichbar.`
    : c.nearestDist < 10
    ? `Der nächste Strand von ${c.villageName} ist ${c.nearestName} — ein ${typeLabel(c.nearestType, "de")}, ${c.nearestDist.toFixed(1)} km entfernt, eine kurze Autofahrt.`
    : `Der nächste Strand zu ${c.villageName} ist ${c.nearestName}, ein ${typeLabel(c.nearestType, "de")} in ${c.nearestDist.toFixed(1)} km Entfernung.`;

  const parts: string[] = [];
  if (c.sand) parts.push(`${c.sand} Sand`);
  if (c.pebble) parts.push(`${c.pebble} Kiesel`);
  if (c.rock) parts.push(`${c.rock} Fels`);
  if (c.mixed) parts.push(`${c.mixed} gemischt`);
  const mix = parts.join(", ");
  const extras: string[] = [];
  if (c.kids) extras.push(`${c.kids} familienfreundlich`);
  if (c.taverna) extras.push(`${c.taverna} mit Taverne`);
  const extra = extras.length ? `; ${extras.join(", ")}.` : ".";
  const s2 = `Unter den ${c.total} nächsten Stränden (bis ${c.maxDist.toFixed(0)} km): ${mix}${extra}`;
  return `${s1} ${s2}`;
}

function el(c: Ctx): string {
  // Same rough heuristic the page title uses for 300 villages — matches
  // "στο" / "στην" prefix on Η/Ι-starting names. Not linguistically
  // perfect but consistent with the existing surface, and we can't
  // hand-decline 300 slugs.
  const village = c.villageLocativeEl ?? `στ${c.villageName.startsWith("Η") || c.villageName.startsWith("Ι") ? "ο" : "ην"} ${c.villageName}`;
  const s1 = c.nearestDist < 3
    ? `Η πιο κοντινή παραλία ${village} είναι η ${c.nearestName} — ${typeLabel(c.nearestType, "el")}, μόλις ${c.nearestDist.toFixed(1)} χλμ, με τα πόδια ή με το ποδήλατο.`
    : c.nearestDist < 10
    ? `Η πιο κοντινή παραλία ${village} είναι η ${c.nearestName} — ${typeLabel(c.nearestType, "el")}, ${c.nearestDist.toFixed(1)} χλμ, λίγα λεπτά με το αυτοκίνητο.`
    : `Η πιο κοντινή παραλία ${village} είναι η ${c.nearestName}, ${typeLabel(c.nearestType, "el")}, ${c.nearestDist.toFixed(1)} χλμ μακριά.`;

  const parts: string[] = [];
  if (c.sand) parts.push(`${c.sand} αμμώδεις`);
  if (c.pebble) parts.push(`${c.pebble} με βότσαλα`);
  if (c.rock) parts.push(`${c.rock} βραχώδεις`);
  if (c.mixed) parts.push(`${c.mixed} μικτές`);
  const mix = parts.join(", ");
  const extras: string[] = [];
  if (c.kids) extras.push(`${c.kids} κατάλληλες για παιδιά`);
  if (c.taverna) extras.push(`${c.taverna} με ταβέρνα`);
  const extra = extras.length ? `· ${extras.join(", ")}.` : ".";
  const s2 = `Ανάμεσα στις ${c.total} πιο κοντινές παραλίες (έως ${c.maxDist.toFixed(0)} χλμ): ${mix}${extra}`;
  return `${s1} ${s2}`;
}

/**
 * Returns null when the nearest beach is farther than 40 km — the
 * page still lists the 12 closest, but a "beaches near village" claim
 * doesn't hold water for a village stranded far inland (Anogeia etc.).
 */
export function beachVillageInsight(
  villageName: string,
  nearby: NearBeach[],
  locale: string,
  getBeachName: (b: Beach) => string,
  villageLocativeEl?: string,
): string | null {
  if (nearby.length === 0) return null;
  const nearest = nearby[0];
  if (nearest.dist > 40) return null;

  const ctx: Ctx = {
    villageName,
    villageLocativeEl,
    nearestName: getBeachName(nearest),
    nearestType: nearest.type,
    nearestDist: nearest.dist,
    total: nearby.length,
    minDist: nearest.dist,
    maxDist: nearby[nearby.length - 1].dist,
    sand:   nearby.filter(b => b.type === "sand").length,
    pebble: nearby.filter(b => b.type === "pebble").length,
    rock:   nearby.filter(b => b.type === "rock").length,
    mixed:  nearby.filter(b => b.type === "mixed").length,
    kids:   nearby.filter(b => b.kids_friendly).length,
    taverna: nearby.filter(b => b.taverna).length,
  };
  switch (locale) {
    case "fr": return fr(ctx);
    case "de": return de(ctx);
    case "el": return el(ctx);
    default:   return en(ctx);
  }
}
