// scripts/check-car-offer-metrics.mjs : tests purs des props de la page d'offres voiture.
import assert from "node:assert/strict";
import {
  offerViewProps, spreadBucket, daysToPickupBucket, offerCountBucket,
} from "../src/lib/car-offer-metrics.ts";

const T0 = Date.parse("2026-08-26T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

// --- offerCountBucket : borner la cardinalite Plausible ---

ok("le compte d'offres est plafonne a 10+", () => {
  assert.equal(offerCountBucket(0), "0");
  assert.equal(offerCountBucket(9), "9");
  assert.equal(offerCountBucket(10), "10+");
  assert.equal(offerCountBucket(47), "10+");
});

ok("un compte absurde ne produit jamais NaN dans une prop", () => {
  assert.equal(offerCountBucket(Number.NaN), "0");
  assert.equal(offerCountBucket(-3), "0");
});

// --- spreadBucket : l'hypothese « trop d'offres heterogenes » ---

ok("aucune offre = n/a, une seule = single", () => {
  assert.equal(spreadBucket([]), "n/a");
  assert.equal(spreadBucket([340]), "single");
});

ok("ecart serre, moyen et large", () => {
  assert.equal(spreadBucket([100, 110]), "tight"); // 10 %
  assert.equal(spreadBucket([100, 120]), "mid");   // 20 %
  assert.equal(spreadBucket([100, 180]), "wide");  // 80 %
});

ok("les bornes tombent du bon cote", () => {
  assert.equal(spreadBucket([100, 115]), "mid");  // exactement 15 %
  assert.equal(spreadBucket([100, 140]), "wide"); // exactement 40 %
});

ok("l'ordre des prix n'a aucune influence", () => {
  assert.equal(spreadBucket([180, 100, 130]), spreadBucket([100, 130, 180]));
});

ok("un prix nul ou non fini est ignore, jamais une division par zero", () => {
  // Une option sans prix ne doit pas rendre l'ecart infini : elle sort du calcul.
  assert.equal(spreadBucket([0, 100, 110]), "tight");
  assert.equal(spreadBucket([Number.NaN, 200]), "single");
  assert.equal(spreadBucket([0]), "n/a");
});

// --- daysToPickupBucket : explique les departs manques ---

ok("une date deja passee se dit past, c'est le mode d'echec a compter", () => {
  assert.equal(daysToPickupBucket("2026-08-25", T0), "past");
  assert.equal(daysToPickupBucket("2026-01-01", T0), "past");
});

ok("le jour meme, le lendemain, puis les paliers", () => {
  assert.equal(daysToPickupBucket("2026-08-26", T0), "today");
  assert.equal(daysToPickupBucket("2026-08-27", T0), "1");
  assert.equal(daysToPickupBucket("2026-08-29", T0), "2_3");
  assert.equal(daysToPickupBucket("2026-09-02", T0), "4_7");
  assert.equal(daysToPickupBucket("2026-09-25", T0), "8_30");
  assert.equal(daysToPickupBucket("2026-10-19", T0), "30_plus");
});

ok("jours CALENDAIRES : 23h59 puis 00h01 comptent deux jours", () => {
  const tard = Date.parse("2026-08-26T23:59:00Z");
  const tot = Date.parse("2026-08-27T00:01:00Z");
  assert.equal(daysToPickupBucket("2026-08-27", tard), "1");
  assert.equal(daysToPickupBucket("2026-08-27", tot), "today");
});

ok("une date absente ou illisible se dit unknown, jamais past", () => {
  // Traiter l'inconnu comme un depart manque gonflerait le seul mode d'echec
  // que cette mesure existe pour compter.
  assert.equal(daysToPickupBucket(null, T0), "unknown");
  assert.equal(daysToPickupBucket(undefined, T0), "unknown");
  assert.equal(daysToPickupBucket("", T0), "unknown");
  assert.equal(daysToPickupBucket("pas une date", T0), "unknown");
});

// --- offerViewProps : l'assemblage ---

ok("le cas nominal : 3 offres serrees a 12 jours du depart", () => {
  assert.deepEqual(
    offerViewProps({ state: "offers", prices: [310, 330, 340], dateFrom: "2026-09-07", locale: "fr", now: T0 }),
    { state: "offers", offers: "3", spread: "tight", days_to_pickup: "8_30", locale: "fr" },
  );
});

ok("aucune offre encore : le compte est 0 et l'ecart n/a", () => {
  const p = offerViewProps({ state: "none_yet", prices: [], dateFrom: "2026-09-07", locale: "en", now: T0 });
  assert.equal(p.state, "none_yet");
  assert.equal(p.offers, "0");
  assert.equal(p.spread, "n/a");
});

ok("aucune prop ne porte de prix, de date ou d'identifiant", () => {
  // RGPD et lisibilite Plausible : uniquement des categories plafonnees.
  const p = offerViewProps({ state: "offers", prices: [310, 999], dateFrom: "2026-09-07", locale: "de", now: T0 });
  const brut = JSON.stringify(p);
  for (const interdit of ["310", "999", "2026-09-07"]) {
    assert.ok(!brut.includes(interdit), `la prop ne doit pas contenir ${interdit} : ${brut}`);
  }
});

ok("toutes les props sont des chaines, Plausible n'accepte que ca", () => {
  const p = offerViewProps({ state: "already_accepted", prices: [200], dateFrom: null, locale: "el", now: T0 });
  for (const [k, v] of Object.entries(p)) {
    assert.equal(typeof v, "string", `${k} vaut ${typeof v}, attendu string`);
  }
});

ok("le nombre de valeurs distinctes reste borne", () => {
  // Garde-fou de cardinalite : 11 comptes x 5 ecarts x 8 delais x 4 locales.
  const comptes = new Set();
  for (let i = 0; i <= 40; i++) comptes.add(offerCountBucket(i));
  assert.equal(comptes.size, 11);
  const delais = new Set();
  for (let d = -2; d <= 400; d++) delais.add(daysToPickupBucket(new Date(T0 + d * DAY).toISOString().slice(0, 10), T0));
  assert.ok(delais.size <= 8, `delais distincts : ${delais.size}`);
});

console.log(`\ncheck:car-offer-metrics -> ${n} tests OK`);
