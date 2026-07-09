// node --experimental-strip-types scripts/check-activity-lead.mjs
// Teste la validation PURE de la demande d'activité (logique de l'API
// /api/activities/submit extraite dans src/lib/activity-lead.ts, zéro I/O).
import { validateActivityLead } from "../src/lib/activity-lead.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const valid = {
  category: "hiking", city: "heraklion", date: "2026-08-01",
  name: "Jane Doe", email: "Test@EXAMPLE.com", adults: 2,
  locale: "fr", timeslot: "morning", language: "fr",
  children: 1, phone: "+30 555 123", note: "x".repeat(600), source: "widget",
};

// honeypot
ok("honeypot rempli -> kind honeypot",
  validateActivityLead({ ...valid, website: "x" }).kind === "honeypot");

// catégorie inconnue -> 422
ok("catégorie inconnue -> 422", (() => {
  const r = validateActivityLead({ ...valid, category: "skydiving" });
  return r.kind === "error" && r.status === 422;
})());

// ville inconnue -> 422
ok("ville inconnue -> 422", (() => {
  const r = validateActivityLead({ ...valid, city: "atlantis" });
  return r.kind === "error" && r.status === 422;
})());

// date mal formée -> 422
ok("date malformée ('2026/08/01') -> 422", (() => {
  const r = validateActivityLead({ ...valid, date: "2026/08/01" });
  return r.kind === "error" && r.status === 422;
})());

// date passée -> 422 (todayIso injectable)
ok("date passée -> 422 (todayIso injectable)", (() => {
  const r = validateActivityLead({ ...valid, date: "2026-07-07" }, "2026-07-08");
  return r.kind === "error" && r.status === 422;
})());

// adults 0 -> 422
ok("adults 0 -> 422", (() => {
  const r = validateActivityLead({ ...valid, adults: 0 });
  return r.kind === "error" && r.status === 422;
})());

// adults 21 -> 422
ok("adults 21 -> 422", (() => {
  const r = validateActivityLead({ ...valid, adults: 21 });
  return r.kind === "error" && r.status === 422;
})());

// children -1 -> 422
ok("children -1 -> 422", (() => {
  const r = validateActivityLead({ ...valid, children: -1 });
  return r.kind === "error" && r.status === 422;
})());

// email invalide -> 422
ok("email invalide -> 422", (() => {
  const r = validateActivityLead({ ...valid, email: "notanemail" });
  return r.kind === "error" && r.status === 422;
})());

// nom vide -> 422
ok("nom vide -> 422", (() => {
  const r = validateActivityLead({ ...valid, name: "   " });
  return r.kind === "error" && r.status === 422;
})());

// timeslot invalide -> lead OK mais row.timeslot === null (toléré)
ok("timeslot invalide ('night') -> lead ok, row.timeslot === null", (() => {
  const r = validateActivityLead({ ...valid, timeslot: "night" });
  return r.kind === "ok" && r.row.timeslot === null;
})());

// preferred_language invalide -> row.preferred_language === null
ok("preferred_language invalide ('es') -> row.preferred_language === null", (() => {
  const r = validateActivityLead({ ...valid, language: "es" });
  return r.kind === "ok" && r.row.preferred_language === null;
})());

// lead valide complet
const good = validateActivityLead(valid, "2026-07-08");
ok("lead valide -> kind ok", good.kind === "ok");
ok("status sent", good.kind === "ok" && good.row.status === "sent");
ok("note 600 chars tronquée à 500", good.kind === "ok" && good.row.note !== null && good.row.note.length === 500);
ok("email lowercasé", good.kind === "ok" && good.row.customer_email === "test@example.com");

// children absent -> row.children === 0
ok("children absent -> row.children === 0", (() => {
  const body = { ...valid };
  delete body.children;
  const r = validateActivityLead(body, "2026-07-08");
  return r.kind === "ok" && r.row.children === 0;
})());

process.exit(fail ? 1 : 0);
