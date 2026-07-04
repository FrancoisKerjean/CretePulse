// node --experimental-strip-types scripts/check-car-admin.mjs
// Logique PURE du back-office /admin/car-rental (src/lib/car-admin.ts) :
// commissions, agrégats, stats partenaires, validations, message WhatsApp.
import {
  commissionEur, requestCommission, requestsSummary, partnerStats,
  validatePartnerUpdate, buildCarWaMessage, waHref, ZONE_IDS,
} from "../src/lib/car-admin.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

// --- commission ---
ok("commissionEur arrondi au centime", commissionEur(333.33, 0.1) === 33.33);
ok("commissionEur taux partenaire (pas 10% en dur)", commissionEur(200, 0.15) === 30);
ok("commissionEur demi-centime arrondi haut", commissionEur(85.75, 0.1) === 8.58);

const partner = { id: 1, name: "Auto Smart Car Rental", email: "a@b.c", phone: "+306974147291",
  whatsapp: "+306974147291", zone_ids: ["chania-west"], commission: 0.1, lead_routing: "direct",
  active: true, created_at: "2026-07-04" };
const byId = new Map([[1, partner]]);
const base = { id: 10, created_at: "2026-07-04", status: "accepted", locale: "en",
  pickup_slug: "chania", zone_id: "chania-west", date_from: "2026-07-10", time_from: "10:00",
  date_to: "2026-07-17", time_to: null, flight_no: "A3 123", car_type: "compact", pax: 2,
  insurance: null, payment_method: null, customer_name: "Jane Doe", customer_email: "j@d.com",
  customer_phone: "+30 555", note: null, quoted_price: 300, quoted_at: "2026-07-04",
  accepted_at: "2026-07-04", quoted_by_partner_id: 1 };

ok("requestCommission rented + montant + partenaire", requestCommission({ ...base, outcome: "rented", final_amount_eur: 300 }, byId) === 30);
ok("requestCommission lost -> null", requestCommission({ ...base, outcome: "lost", final_amount_eur: 300 }, byId) === null);
ok("requestCommission sans montant -> null", requestCommission({ ...base, outcome: "rented", final_amount_eur: null }, byId) === null);
ok("requestCommission partenaire inconnu -> null", requestCommission({ ...base, outcome: "rented", final_amount_eur: 300, quoted_by_partner_id: 99 }, byId) === null);
ok("requestCommission colonnes admin absentes (pré-migration) -> null", requestCommission(base, byId) === null);
ok("requestCommission snapshot stocké prime sur le taux courant",
  requestCommission({ ...base, outcome: "rented", final_amount_eur: 300, commission_eur: 27 }, byId) === 27);
ok("requestCommission snapshot même si partenaire inconnu",
  requestCommission({ ...base, outcome: "rented", final_amount_eur: 300, commission_eur: 27, quoted_by_partner_id: 99 }, byId) === 27);

// --- agrégats ---
const reqs = [
  { ...base, id: 1, status: "sent" },
  { ...base, id: 2, status: "quoted" },
  { ...base, id: 3, outcome: "rented", final_amount_eur: 300 },                                  // due 30
  { ...base, id: 4, outcome: "rented", final_amount_eur: 100, commission_paid_at: "2026-07-01" }, // encaissée 10
  { ...base, id: 5, outcome: "lost" },
];
const s = requestsSummary(reqs, byId);
ok("summary byStatus", s.byStatus.sent === 1 && s.byStatus.quoted === 1 && s.byStatus.accepted === 3);
ok("summary issues", s.rented === 2 && s.lost === 1);
ok("summary commission due", s.commissionDueEur === 30);
ok("summary commission encaissée", s.commissionPaidEur === 10);

// --- stats partenaire ---
const st = partnerStats(1, reqs, new Map([[1, 5]]), byId);
ok("partnerStats invites", st.invites === 5);
ok("partnerStats devis gagnés (quoted_by)", st.won === 5);
ok("partnerStats rented", st.rented === 2);
ok("partnerStats commission générée (due + encaissée)", st.commissionEur === 40);

// --- accumulation flottante : 3 × 11.11 doit donner exactement 33.33 ---
const fpReqs = [
  { ...base, id: 21, outcome: "rented", final_amount_eur: 111.1 },
  { ...base, id: 22, outcome: "rented", final_amount_eur: 111.1 },
  { ...base, id: 23, outcome: "rented", final_amount_eur: 111.1 },
];
ok("summary somme flottante re-arrondie", requestsSummary(fpReqs, byId).commissionDueEur === 33.33);
ok("partnerStats somme flottante re-arrondie", partnerStats(1, fpReqs, new Map(), byId).commissionEur === 33.33);

// --- validations ---
// (canSetOutcome supprimé 05/07 : toute demande non classée est classable,
// l'UI teste `outcome == null` — les vieilles `sent` relais étaient
// inclassables à vie.)
ok("ZONE_IDS = les 4 zones de car-partners.ts", ZONE_IDS.length === 4 && ZONE_IDS.includes("lasithi-east"));
ok("update partenaire valide", validatePartnerUpdate({ zone_ids: ["chania-west"], commission: 0.12 }) === null);
ok("update zone inconnue rejeté", validatePartnerUpdate({ zone_ids: ["mars"], commission: 0.1 }) !== null);
ok("update zéro zone rejeté", validatePartnerUpdate({ zone_ids: [], commission: 0.1 }) !== null);
ok("update commission hors bornes rejeté", validatePartnerUpdate({ zone_ids: ["rethymno"], commission: 0.6 }) !== null);

// --- message WhatsApp : MÊME format que l'email relais legacy (email.ts) ---
const wa = buildCarWaMessage({ partnerFirstName: "Auto", pickupLabel: "Chania",
  dateFrom: "2026-07-10", timeFrom: "10:00", flightNo: "A3 123",
  dateTo: "2026-07-17", timeTo: null, carTypeLabel: "Compact", pax: 2,
  customerName: "Jane Doe", customerContact: "+30 555" });
ok("wa message format exact", wa === [
  "Hi Auto, new rental request:",
  "Chania, 2026-07-10 10:00 (flight A3 123) to 2026-07-17",
  "Compact, 2 people",
  "Guest: Jane Doe, +30 555",
].join("\n"));
ok("wa message champs optionnels absents", buildCarWaMessage({ partnerFirstName: "A", pickupLabel: "Sitia",
  dateFrom: "2026-08-01", dateTo: "2026-08-05", carTypeLabel: "SUV",
  customerName: "Bob", customerContact: "b@c.d" }) === [
  "Hi A, new rental request:",
  "Sitia, 2026-08-01 to 2026-08-05",
  "SUV, ? people",
  "Guest: Bob, b@c.d",
].join("\n"));
ok("waHref strip non-digits + encode", waHref("+30 697 414-7291", "a b\nc") === "https://wa.me/306974147291?text=a%20b%0Ac");

process.exit(fail ? 1 : 0);
