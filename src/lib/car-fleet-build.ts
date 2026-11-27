// Projection de la flotte réelle des loueurs (relevé `data/car-fleet/flottes.json`
// + photos `data/car-fleet/manifest.json`) vers `src/data/car-fleet.json`.
// Pur, zéro I/O : importé par scripts/gen-car-fleet.mjs, scripts/check-car-fleet.mjs
// (node type-stripping, d'où les imports sans alias) et par car-fleet.ts.

export type FleetBody = "city" | "compact" | "sedan" | "suv" | "van" | "other";
export type FleetGearbox = "manual" | "automatic" | "both" | null;
export type FleetFuel = "gasoline" | "diesel" | "hybrid" | "electric" | null;

export interface FleetModel {
  model: string;
  body: FleetBody;
  gearbox: FleetGearbox;
  fuel: FleetFuel;
  seats: number | null;
  photo640: string | null;
  photo1280: string | null;
  photoQuality: "good" | "ok" | null;
  /** Détouré ou fond uni : la photo se pose sur n'importe quelle carte. */
  photoUniform: boolean | null;
  /** Vu à la fois sur le site du loueur et dans ses devis. */
  confirmed: boolean;
  /** Nombre de devis 2026 qui citent ce modèle. */
  quotes2026: number;
}
export interface FleetPartner { name: string; models: FleetModel[] }
/** Clé = id `car_partners` en chaîne. */
export type CarFleet = Record<string, FleetPartner>;

export interface SourceModel {
  model: string;
  category: string;
  gearbox: string | null;
  fuel: string | null;
  seats: number | null;
  siteGroup?: string | null;
  sources: string[];
  confirmed: boolean;
}
export interface SourcePartner { id: number; name: string; models: SourceModel[] }
export interface ManifestPhoto {
  partnerId: number;
  model: string;
  gearbox: string | null;
  src640: string;
  /** null quand la source fait moins de 1 100 px : seule la 640 existe. */
  src1280: string | null;
  quality: string;
  uniformBackground: boolean;
}

/** Clé de comparaison d'un nom de modèle : casse, accents, ponctuation, « Volkswagen » = « VW ». */
export function modelKey(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bvolkswagen\b/g, "vw")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function quotesOf(sources: string[]): number {
  for (const s of sources) {
    const m = /devis 2026 \(x(\d+)\)/.exec(s);
    if (m) return Number(m[1]);
  }
  return 0;
}

const RAW_BODIES = new Set(["city", "compact", "sedan", "suv", "other"]);
// Minibus, monospaces et utilitaires vitrés : le relevé les range en « other »
// et ne donne pas toujours le nombre de places.
const VAN_HINT = /\b(van|minivan|minibus|mini bus|mpv|7 places|7 seater|proace|transporter|trafic|vito|vivaro)\b/;

export function bodyOf(m: SourceModel): FleetBody {
  if (!RAW_BODIES.has(m.category)) throw new Error(`catégorie inconnue « ${m.category} » pour ${m.model}`);
  if ((m.seats ?? 0) >= 7) return "van";
  if (m.category !== "other") return m.category as FleetBody;
  return VAN_HINT.test(modelKey(`${m.model} ${m.siteGroup ?? ""}`)) ? "van" : "other";
}

function gearboxOf(g: string | null): FleetGearbox {
  return g === "manual" || g === "automatic" || g === "both" ? g : null;
}

function fuelOf(f: string | null): FleetFuel {
  if (f === "petrol") return "gasoline";
  return f === "gasoline" || f === "diesel" || f === "hybrid" || f === "electric" ? f : null;
}

function mergeGearbox(a: FleetGearbox, b: FleetGearbox): FleetGearbox {
  if (!a) return b;
  if (!b || a === b) return a;
  return "both";
}

const betterPhoto = (a: ManifestPhoto | undefined, b: ManifestPhoto | undefined) =>
  !a ? b : b && b.quality === "good" && a.quality !== "good" ? b : a;

export function buildCarFleet(partners: SourcePartner[], manifest: ManifestPhoto[]): CarFleet {
  const ids = new Set<number>();
  for (const p of partners) {
    if (ids.has(p.id)) throw new Error(`id loueur ${p.id} en double dans le relevé`);
    ids.add(p.id);
  }

  const photos = new Map<string, ManifestPhoto[]>();
  for (const ph of manifest) {
    const partner = partners.find((p) => p.id === ph.partnerId);
    if (!partner) throw new Error(`photo ${ph.src640} : id loueur inconnu ${ph.partnerId}`);
    if (!partner.models.some((m) => modelKey(m.model) === modelKey(ph.model))) {
      throw new Error(`photo ${ph.src640} : modèle « ${ph.model} » absent du relevé du loueur ${ph.partnerId}`);
    }
    const k = `${ph.partnerId}|${modelKey(ph.model)}`;
    photos.set(k, [...(photos.get(k) ?? []), ph]);
  }

  const fleet: CarFleet = {};
  for (const p of partners) {
    const byKey = new Map<string, { m: FleetModel; photo: ManifestPhoto | undefined }>();
    for (const s of p.models) {
      const key = modelKey(s.model);
      const photo = (photos.get(`${p.id}|${key}`) ?? []).reduce<ManifestPhoto | undefined>(betterPhoto, undefined);
      const m: FleetModel = {
        model: s.model,
        body: bodyOf(s),
        gearbox: gearboxOf(s.gearbox),
        fuel: fuelOf(s.fuel),
        seats: s.seats ?? null,
        photo640: null, photo1280: null, photoQuality: null, photoUniform: null,
        confirmed: s.confirmed === true,
        quotes2026: quotesOf(s.sources),
      };
      const prev = byKey.get(key);
      if (prev) {
        prev.m.gearbox = mergeGearbox(prev.m.gearbox, m.gearbox);
        prev.m.fuel ??= m.fuel;
        prev.m.seats ??= m.seats;
        prev.m.confirmed ||= m.confirmed;
        prev.m.quotes2026 = Math.max(prev.m.quotes2026, m.quotes2026);
      } else {
        byKey.set(key, { m, photo });
      }
    }
    const models: FleetModel[] = [];
    for (const { m, photo } of byKey.values()) {
      if (photo) {
        m.photo640 = photo.src640;
        m.photo1280 = photo.src1280;
        m.photoQuality = photo.quality === "good" ? "good" : "ok";
        m.photoUniform = photo.uniformBackground === true;
      }
      if (m.confirmed || m.quotes2026 > 0 || m.photo640) models.push(m);
    }
    fleet[String(p.id)] = { name: p.name, models };
  }
  return fleet;
}
