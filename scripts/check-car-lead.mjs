// node --experimental-strip-types scripts/check-car-lead.mjs
// Teste la validation PURE de la demande de location (logique de l'API
// /api/car-rental/submit extraite dans src/lib/car-lead.ts, zéro I/O).
import { validateCarLead, carPickupLabel } from "../src/lib/car-lead.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const valid = {
  pickup: "chania", carType: "compact", email: "Jane@Example.com ", name: "  Jane  ",
  dateFrom: "2026-07-01", dateTo: "2026-07-08", locale: "fr",
  timeFrom: "10:00", timeTo: "18:00", flightNo: "A3 123", pax: 3, phone: "+30 555", note: "x", source: "airport",
};

ok("honeypot rempli -> kind honeypot (avant toute validation)",
  validateCarLead({ pickup: "nope", website: "bot" }).kind === "honeypot");

let r = validateCarLead({ ...valid, pickup: "sitia" });
ok("sitia (zone lasithi-est) -> ok, couverture vérifiée en route", r.kind === "ok" && r.row.zone_id === "lasithi-east");
ok("pickup inconnu -> error 422 (hors zone)", validateCarLead({ ...valid, pickup: "nope" }).status === 422);

ok("email invalide -> 422", (() => { const x = validateCarLead({ ...valid, email: "nope" }); return x.kind === "error" && x.status === 422; })());
ok("nom vide -> 422", validateCarLead({ ...valid, name: "   " }).status === 422);
ok("carType inconnu -> 422", validateCarLead({ ...valid, carType: "spaceship" }).status === 422);

ok("date mal formée -> 422 'Invalid dates'", (() => { const x = validateCarLead({ ...valid, dateFrom: "01/07/2026" }); return x.kind === "error" && x.error === "Invalid dates"; })());
ok("dateTo < dateFrom -> 422 'Invalid dates'", validateCarLead({ ...valid, dateTo: "2026-06-01" }).error === "Invalid dates");
ok("heure d'arrivée manquante -> 422 'Invalid times'", (() => {
  const x = validateCarLead({ ...valid, timeFrom: undefined, timeTo: "17:00" });
  return x.kind === "error" && x.error === "Invalid times";
})());
ok("heure de retour manquante -> 422 'Invalid times'", (() => {
  const x = validateCarLead({ ...valid, timeFrom: "09:00", timeTo: undefined });
  return x.kind === "error" && x.error === "Invalid times";
})());
ok("heure mal formée -> 422 'Invalid times'", (() => {
  const x = validateCarLead({ ...valid, timeFrom: "9am", timeTo: "17:00" });
  return x.kind === "error" && x.error === "Invalid times";
})());
ok("même jour avec retour avant prise en charge -> 422 'Invalid times'", (() => {
  const x = validateCarLead({ ...valid, dateFrom: "2026-09-25", dateTo: "2026-09-25", timeFrom: "17:40", timeTo: "02:40" });
  return x.kind === "error" && x.error === "Invalid times";
})());
ok("même jour avec retour après prise en charge -> ok", validateCarLead({ ...valid, dateFrom: "2026-09-25", dateTo: "2026-09-25", timeFrom: "09:00", timeTo: "17:00" }).kind === "ok");

const good = validateCarLead(valid);
ok("demande valide -> kind ok", good.kind === "ok");
ok("email normalisé (trim + lowercase)", good.kind === "ok" && good.row.customer_email === "jane@example.com");
ok("nom trimmé", good.kind === "ok" && good.row.customer_name === "Jane");
ok("zone_id depuis la zone", good.kind === "ok" && good.row.zone_id === "chania-west");
ok("zone résolue = chania-west", good.kind === "ok" && good.zone.id === "chania-west");
ok("partner non résolu ici (registre DB, en route)", good.kind === "ok" && good.row.partner_email === null);
ok("carType résolu (data, sans icône)", good.kind === "ok" && good.carType.id === "compact" && good.carType.labels.en === "Compact");
ok("status sent", good.kind === "ok" && good.row.status === "sent");
ok("pax entier conservé", good.kind === "ok" && good.row.pax === 3);
ok("champs str() nullables", good.kind === "ok" && good.row.flight_no === "A3 123" && good.row.note === "x");
ok("source mappée", good.kind === "ok" && good.row.source === "airport");

// gearbox + sièges enfants (retour loueur Lux Trans 08/07)
ok("gearbox par défaut null (non fourni)", good.kind === "ok" && good.row.gearbox === null);
ok("child_seats par défaut []", good.kind === "ok" && Array.isArray(good.row.child_seats) && good.row.child_seats.length === 0);
ok("gearbox automatic accepté", (() => { const x = validateCarLead({ ...valid, gearbox: "automatic" }); return x.kind === "ok" && x.row.gearbox === "automatic"; })());
ok("gearbox manual accepté", (() => { const x = validateCarLead({ ...valid, gearbox: "manual" }); return x.kind === "ok" && x.row.gearbox === "manual"; })());
ok("gearbox invalide -> null (peu importe)", (() => { const x = validateCarLead({ ...valid, gearbox: "cvt" }); return x.kind === "ok" && x.row.gearbox === null; })());
ok("child_seats clés valides conservées", (() => { const x = validateCarLead({ ...valid, childSeats: ["baby_cot", "booster"] }); return x.kind === "ok" && x.row.child_seats.length === 2 && x.row.child_seats[0] === "baby_cot"; })());
ok("child_seats clés inconnues filtrées", (() => { const x = validateCarLead({ ...valid, childSeats: ["baby_seat", "spaceship_seat"] }); return x.kind === "ok" && x.row.child_seats.length === 1 && x.row.child_seats[0] === "baby_seat"; })());
ok("child_seats non-array -> []", (() => { const x = validateCarLead({ ...valid, childSeats: "baby_cot" }); return x.kind === "ok" && x.row.child_seats.length === 0; })());

ok("carPickupLabel", carPickupLabel("agios-nikolaos") === "Agios Nikolaos");

process.exit(fail ? 1 : 0);
