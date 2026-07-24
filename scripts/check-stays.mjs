import { computeQuote } from "../src/lib/stays/pricing.ts";
import { computeRefund } from "../src/lib/stays/cancellation.ts";
import { validateStayRequest } from "../src/lib/stays/validation.ts";

let failures = 0;
const ok = (label, cond) => {
  if (!cond) {
    console.error("FAIL:", label);
    failures++;
  } else {
    console.log("ok:", label);
  }
};

const q = computeQuote({
  basePriceEur: 700,
  cleaningFeeEur: 0,
  commissionRate: 5,
  dateFrom: "2026-07-01",
  dateTo: "2026-07-08",
});
ok("guest total = 735", q.guestTotalEur === 735);
ok("deposit = 220.5", q.depositEur === 220.5);
ok("refund >14 = 100%", computeRefund(735, 20) === 735);
ok("refund <48h = 0", computeRefund(735, 1) === 0);
ok(
  "honeypot detected",
  validateStayRequest({
    website: "x",
    guestName: "a",
    guestEmail: "a@b.c",
    dateFrom: "2026-07-01",
    dateTo: "2026-07-02",
  }).kind === "honeypot",
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("check:stays OK");
