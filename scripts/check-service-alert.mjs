// node --experimental-strip-types scripts/check-service-alert.mjs
import { alertSummary, alertSource } from "../src/components/serviceAlert.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const mk = (over = {}) => ({
  id: 1, slug: "a", title: "Road closure Neapoli", category: null,
  published_date: "2026-06-15", url: "https://x", matched_routes: null, ...over,
});

// 0 alerte -> chaîne vide
ok("empty -> ''", alertSummary([], "fr") === "");
// 1 alerte AVEC matched_routes -> label · routes jointes
ok("1 with routes (fr)",
  alertSummary([mk({ matched_routes: ["Neapoli", "Ag. Nikolaos"] })], "fr")
  === "Alerte service · Neapoli · Ag. Nikolaos");
// 1 alerte SANS matched_routes -> label · title
ok("1 no routes (fr)",
  alertSummary([mk({ matched_routes: null, title: "Fermeture route" })], "fr")
  === "Alerte service · Fermeture route");
// matched_routes vide -> traité comme absent -> title
ok("1 empty routes -> title",
  alertSummary([mk({ matched_routes: [], title: "T" })], "fr")
  === "Alerte service · T");
// N alertes -> "N alertes service · voir"
ok("2 alerts (fr)",
  alertSummary([mk(), mk({ slug: "b" })], "fr") === "2 alertes service · voir");
// fallback locale inconnue -> EN
ok("unknown locale -> en", alertSummary([mk({ matched_routes: ["X"] })], "zz")
  === "Service alert · X");
ok("en 2 alerts", alertSummary([mk(), mk({ slug: "b" })], "en")
  === "2 service alerts · view");
// source line dépend du variant + fallback
ok("source route fr", alertSource("route", "fr").startsWith("Cliquez pour lire"));
ok("source global fr", alertSource("global", "fr").startsWith("Annonces KTEL"));
ok("source fallback en", alertSource("route", "zz").startsWith("Click to read"));

console.log(fail === 0 ? "ALL OK" : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
