// Genere le path SVG de la vraie silhouette de la Crete (geoBoundaries ADM1)
// + la projection lat/lng -> % pour les pins de CreteMap.
// Run: node scripts/gen-crete-path.mjs  (greece-adm1.geojson a la racine)
import fs from "fs";

const g = JSON.parse(fs.readFileSync("greece-adm1.geojson", "utf8"));
const crete = g.features.find((f) => f.properties.shapeName === "Crete");

// Plus grande etendue = l'ile principale (on ignore Gavdos, Dia, etc.)
const rings = [];
const geom = crete.geometry;
if (geom.type === "Polygon") rings.push(geom.coordinates[0]);
else for (const poly of geom.coordinates) rings.push(poly[0]);
const extent = (r) => {
  const xs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
};
rings.sort((a, b) => extent(b) - extent(a));
console.log("rings:", rings.map((r) => `${r.length}pts ext=${extent(r).toFixed(4)}`).slice(0, 5).join(" | "));
let ring = rings[0];

// Projection equirectangular corrigee cos(lat moyenne), fit 460x150 pad 12
const lats = ring.map((p) => p[1]);
const lons = ring.map((p) => p[0]);
const minLon = Math.min(...lons), maxLon = Math.max(...lons);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const midLat = (minLat + maxLat) / 2;
const k = Math.cos((midLat * Math.PI) / 180);
const W = 460, H = 150, PAD = 12;
const spanX = (maxLon - minLon) * k;
const spanY = maxLat - minLat;
const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
const offX = (W - spanX * scale) / 2;
const offY = (H - spanY * scale) / 2;
const proj = ([lon, lat]) => [
  offX + (lon - minLon) * k * scale,
  offY + (maxLat - lat) * scale,
];

// ring ferme (1er == dernier) : retirer la fermeture avant simplification,
// et couper en 2 segments pour que DP garde les extremites est/ouest.
let open = ring.slice();
if (open.length > 2 && open[0][0] === open[open.length - 1][0] && open[0][1] === open[open.length - 1][1]) open.pop();
let pts = open.map(proj);
let xMaxIdx = 0;
for (let i = 1; i < pts.length; i++) if (pts[i][0] > pts[xMaxIdx][0]) xMaxIdx = i;
pts = [...pts.slice(xMaxIdx), ...pts.slice(0, xMaxIdx)];

// Simplification Douglas-Peucker (silhouette douce, DA ronde)
function dp(points, eps) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let maxD = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) /
      Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  return [...dp(points.slice(0, idx + 1), eps).slice(0, -1), ...dp(points.slice(idx), eps)];
}
// DP sur 2 moities (boucle ouverte aux 2 bouts pour garder la forme)
const half = Math.floor(pts.length / 2);
const partA = dp(pts.slice(0, half + 1), 2.2);
const partB = dp(pts.slice(half), 2.2);
pts = [...partA.slice(0, -1), ...partB.slice(0, -1)];

// Lissage : quadratiques par points milieux (rondeur Kalimera)
const f = (n) => Math.round(n * 10) / 10;
const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
let d = `M${f(mid(pts[pts.length - 1], pts[0])[0])} ${f(mid(pts[pts.length - 1], pts[0])[1])}`;
for (let i = 0; i < pts.length; i++) {
  const p = pts[i];
  const m = mid(p, pts[(i + 1) % pts.length]);
  d += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
}
d += " Z";

console.log("POINTS:", pts.length);
console.log("PATH:", d);

// Pins : villes weather.ts + projection en %
const CITIES = {
  "Heraklion": [25.13, 35.34], "Chania": [24.02, 35.51], "Rethymno": [24.47, 35.37],
  "Ag. Nikolaos": [25.72, 35.19], "Ierapetra": [25.74, 35.01], "Sitia": [26.10, 35.21],
  "Makrigialos": [25.97, 35.03], "Elounda": [25.73, 35.26], "Hersonissos": [25.38, 35.31],
  "Malia": [25.46, 35.29],
};
const pos = {};
for (const [name, [lon, lat]] of Object.entries(CITIES)) {
  const [x, y] = proj([lon, lat]);
  pos[name] = { leftPct: Math.round((x / W) * 1000) / 10, topPct: Math.round((y / H) * 1000) / 10 };
}
console.log("CITY_POS:", JSON.stringify(pos, null, 2));
console.log("PROJ:", JSON.stringify({ minLon, maxLat, k, scale, offX, offY, W, H }));

// Preview HTML
fs.writeFileSync("crete-path-preview.html", `<!doctype html><body style="background:#F6FBFC;padding:40px">
<div style="max-width:560px;background:rgba(255,255,255,.58);border-radius:30px;padding:24px;box-shadow:0 18px 50px rgba(11,94,120,.22)">
<svg viewBox="0 0 460 150" style="width:100%">
<defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CCB72"/><stop offset=".55" stop-color="#7C9A53"/><stop offset="1" stop-color="#C9A36A"/></linearGradient></defs>
<path d="${d}" fill="url(#ig)" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
${Object.entries(pos).slice(0, 6).map(([n, p]) => {
  const x = (p.leftPct / 100) * 460, y = (p.topPct / 100) * 150;
  return `<circle cx="${x}" cy="${y}" r="4" fill="#07374A" stroke="#fff" stroke-width="2"/><text x="${x + 6}" y="${y - 4}" font-size="10" font-family="sans-serif" fill="#0B3954">${n}</text>`;
}).join("")}
</svg></div></body>`);
console.log("preview: crete-path-preview.html");

// ── Zones detourees (Sutherland-Hodgman sur le polygone projete) ──────────
// west x<140 ; central 140-275 & y<95 ; south 140-275 & y>=95 ; east x>=275
function clipHalf(points, test, intersect) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const cur = points[i], prev = points[(i + points.length - 1) % points.length];
    const cIn = test(cur), pIn = test(prev);
    if (cIn) {
      if (!pIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (pIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}
const ixV = (x0) => (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; };
const ixH = (y0) => (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y0]; };
function clipRect(points, x1, x2, y1, y2) {
  let p = points;
  p = clipHalf(p, (q) => q[0] >= x1, ixV(x1));
  p = clipHalf(p, (q) => q[0] <= x2, ixV(x2));
  p = clipHalf(p, (q) => q[1] >= y1, ixH(y1));
  p = clipHalf(p, (q) => q[1] <= y2, ixH(y2));
  return p;
}
function smoothPath(points) {
  if (points.length < 3) return "";
  let dd = `M${f(mid(points[points.length - 1], points[0])[0])} ${f(mid(points[points.length - 1], points[0])[1])}`;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const m = mid(p, points[(i + 1) % points.length]);
    dd += ` Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return dd + " Z";
}
// densifier les aretes longues pour que les coupes droites restent droites apres lissage
function densify(points, maxLen = 6) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(len / maxLen);
    for (let j = 1; j <= n; j++) out.push([a[0] + ((b[0] - a[0]) * j) / (n + 1), a[1] + ((b[1] - a[1]) * j) / (n + 1)]);
  }
  return out;
}
const XW = 140, XE = 275, YS = 95;
const ZONES = {
  west: clipRect(pts, -10, XW, -10, 200),
  central: clipRect(pts, XW, XE, -10, YS),
  south: clipRect(pts, XW, XE, YS, 200),
  east: clipRect(pts, XE, 470, -10, 200),
};
console.log("ZONE_PATHS:");
for (const [name, zp] of Object.entries(ZONES)) {
  console.log(`"${name}": "${smoothPath(densify(zp))}",`);
}
