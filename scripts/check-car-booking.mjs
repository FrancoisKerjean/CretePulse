// Gate CI du tunnel voyageur car-rental. Appelle les memes fonctions que la
// route de paiement : une derive de repartition ou un retour du transfer_data
// tombent ici, pas en production.
import { bookingTotalEur, bookingBreakdownCents, buildBookingCheckoutParams } from "../src/lib/car-booking.ts";
import { CANCELLATION_OPTION_EUR } from "../src/lib/booking-policy.ts";

let failures = 0;
const ok = (label, cond) => {
  if (!cond) { console.error("FAIL:", label); failures++; } else console.log("ok:", label);
};

// Invariant 1, le plus important : rien ne se perd et rien ne s'invente entre
// ce que paie le client, ce que touche le loueur et ce qu'encaisse crete.direct.
for (const [price, rate] of [[310, 0.1], [89.9, 0.1], [233.33, 0.075], [1250.55, 0.12], [45, 0.2], [19.99, 0.15]]) {
  for (const hasOption of [true, false]) {
    const b = bookingBreakdownCents({ quotedPriceEur: price, hasOption, partnerRate: rate });
    ok(
      `repartition exacte a ${price} EUR / ${rate * 100} %${hasOption ? " + option" : ""}`,
      b.partnerPayoutCents + b.commissionCents + b.optionCents === b.totalCents,
    );
    ok(`le loueur touche moins que le total (${price} EUR)`, b.partnerPayoutCents < b.totalCents);
    ok(`le total colle au prix affiche (${price} EUR)`, b.totalCents === Math.round(bookingTotalEur(price, hasOption) * 100));
  }
}

// Invariant 2 : l'option n'est jamais reversee au loueur. Elle paie le risque
// d'annulation, que porte crete.direct seule.
const withOpt = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: true, partnerRate: 0.1 });
const noOpt = bookingBreakdownCents({ quotedPriceEur: 310, hasOption: false, partnerRate: 0.1 });
ok("l option ne change pas le payout loueur", withOpt.partnerPayoutCents === noOpt.partnerPayoutCents);
ok("l option vaut bien 5 EUR", withOpt.optionCents === Math.round(CANCELLATION_OPTION_EUR * 100));

// Invariant 3 : charges separees. Un transfer_data ici rouvrirait la reprise de
// fonds a l'annulation, tout le modele s'effondre.
const p = buildBookingCheckoutParams({
  requestId: 1, customerEmail: "x@y.z", quotedPriceEur: 310, hasOption: true,
  partnerName: "P", carLabel: "City car", dateFrom: "2026-09-25", dateTo: "2026-10-09",
  bookingToken: "tok", locale: "fr",
});
ok("aucun transfer_data : les fonds restent sur la plateforme", p.payment_intent_data.transfer_data === undefined);
ok("aucun application_fee_amount", p.payment_intent_data.application_fee_amount === undefined);
ok("discriminants webhook presents", p.metadata.payment_type === "car_booking" && p.metadata.brand === "crete.direct");

// Invariant 4 : vocabulaire. « Assurance » engagerait une activite reglementee.
const labels = p.line_items.map((l) => `${l.price_data.product_data.name} ${l.price_data.product_data.description ?? ""}`).join(" ");
ok("jamais le mot assurance dans ce qui est vendu", !/assurance|insurance/i.test(labels));
ok("l option est nommee annulation", /annulation|cancellation/i.test(labels));

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("check:car-booking OK");
