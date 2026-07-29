// Gate CI de la politique d'annulation et de versement (decisions Kami 29/07/2026).
// Il appelle les memes fonctions que le produit : une derive de regle tombe ici.
import {
  CANCELLATION_OPTION_EUR, TRANSFER_LEAD_HOURS, REFUND_WINDOW_HOURS,
  refundDueEur, transferDueAt, shouldTransferNow,
} from "../src/lib/booking-policy.ts";

let failures = 0;
const ok = (label, cond) => {
  if (!cond) { console.error("FAIL:", label); failures++; } else console.log("ok:", label);
};

ok("option a 5 EUR", CANCELLATION_OPTION_EUR === 5);
ok("fenetre de remboursement 48 h", REFUND_WINDOW_HOURS === 48);
ok("versement a la fermeture de la fenetre (48 h)", TRANSFER_LEAD_HOURS === REFUND_WINDOW_HOURS);

// Invariant 1 : sans option, jamais un centime rendu, quelle que soit la date.
for (const h of [0, 47, 48, 72, 2160]) {
  ok(`sans option a ${h} h : 0 EUR`, refundDueEur({ hasOption: false, hoursUntilStart: h, amountPaidEur: 310 }) === 0);
}

// Invariant 2 : avec option, tout ou rien, la bascule est a 48 h pile.
ok("avec option a 48 h : integral", refundDueEur({ hasOption: true, hoursUntilStart: 48, amountPaidEur: 310 }) === 310);
ok("avec option a 47,9 h : 0", refundDueEur({ hasOption: true, hoursUntilStart: 47.9, amountPaidEur: 310 }) === 0);
ok("prestation commencee : 0", refundDueEur({ hasOption: true, hoursUntilStart: -1, amountPaidEur: 310 }) === 0);

// Invariant 3 : on ne verse jamais une reservation annulee. C'est la raison
// d'etre du versement differe ; si cela tombe, le modele de remboursement casse.
ok("annulee : aucun versement", shouldTransferNow({ dateFrom: "2026-08-10", now: "2026-08-09T00:00:00Z", cancelledAt: "2026-08-01T00:00:00Z" }) === false);
ok("veille de l echeance : pas encore verse", shouldTransferNow({ dateFrom: "2026-08-10", now: "2026-08-07T23:00:00Z" }) === false);
ok("deja verse : pas de second versement", shouldTransferNow({ dateFrom: "2026-08-10", now: "2026-08-09T00:00:00Z", transferId: "tr_1" }) === false);
ok("trop tot : pas de versement", shouldTransferNow({ dateFrom: "2026-08-20", now: "2026-08-09T00:00:00Z" }) === false);
ok("echeance atteinte : versement", shouldTransferNow({ dateFrom: "2026-08-10", now: "2026-08-08T00:00:00Z" }) === true);
ok("retard rattrape", shouldTransferNow({ dateFrom: "2026-08-01", now: "2026-08-09T00:00:00Z" }) === true);

// Invariant 4, le plus important : le versement au partenaire n'a JAMAIS lieu
// avant la fermeture du droit au remboursement. Tout ecart rouvrirait une fenetre
// ou l'argent est parti alors que le voyageur peut encore etre rembourse, donc une
// reprise de fonds chez le partenaire. C'est la raison d'etre du versement differe.
const startMs = new Date("2026-08-10T00:00:00Z").getTime();
const transferMs = new Date(transferDueAt("2026-08-10")).getTime();
const refundClosesMs = startMs - REFUND_WINDOW_HOURS * 3600 * 1000;
ok("aucune fenetre de reprise de fonds", transferMs >= refundClosesMs);

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("check:booking-policy OK");
