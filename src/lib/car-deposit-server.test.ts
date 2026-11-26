import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { athensWallToUtcMs } from "./car-deposit";
import type { QuoteOption } from "./car-quotes";

const { from, hashToken } = vi.hoisted(() => ({
  from: vi.fn(),
  // Hash opaque : un mock qui recopierait le jeton rendrait impossible
  // l'assertion « le clair ne va jamais en base ».
  hashToken: vi.fn<(plain: string) => string>(() => "deadbeefhash"),
}));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  newToken: () => "book-plain",
  hashToken,
  siteBase: () => "https://crete.direct",
}));

const { refundsCreate, refundsList, notifyOps, sendCarDepositMail, sendCreditNote } = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  refundsList: vi.fn(),
  notifyOps: vi.fn(),
  sendCarDepositMail: vi.fn(),
  sendCreditNote: vi.fn(),
}));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({ refunds: { create: refundsCreate, list: refundsList } }),
}));
vi.mock("./ops-notify", () => ({ notifyOps, echeance: () => "13/07" }));
vi.mock("./email", () => ({
  sendCarDepositMail,
  sendCreditNote,
  formatPhoneWithCountryCode: (p: string | null) => p ?? "-",
}));

import {
  startDeposit, depositRatesFor, onDepositSessionExpired,
  onDepositPaid, confirmBooking, releaseBooking, refundConfirmed, bookingByConfirmToken,
  resumeClaimedRefund, partnerConfirmUrl, remindPartner,
} from "./car-deposit-server";

// Mardi 12/07/2027 à 09:00 heure d'Athènes : en pleine plage d'ouverture.
const NOW = athensWallToUtcMs("2027-07-12", "09:00");

const OPTION: QuoteOption = {
  id: 501,
  invite_id: 77,
  partner_id: 111,
  partner_name: "Zorbas",
  price: 412,
  currency: "EUR",
  car_model: "Fiat Panda",
  gearbox: "manual",
  inclusions: ["unlimited_km"],
  insurance_type: "cdw_excess",
  excess_eur: 800,
  zero_excess_upsell_eur_day: 9,
  note: null,
  created_at: "2027-07-10T08:00:00.000Z",
  source: "catalogue",
};

const ROW = {
  id: 25,
  status: "quoted",
  booking_status: null as string | null,
  date_from: "2027-07-20",
  time_from: "10:00",
};

const PARTNER = { id: 111, name: "Zorbas Rent a Car", commission: 0.1 };

interface Wiring {
  updates: Array<Record<string, unknown>>;
  filters: Array<[string, string, unknown]>;
}

function wiring(opts: {
  row?: Partial<typeof ROW>;
  partner?: unknown;
  writtenRows?: unknown[];
  writeError?: { message: string } | null;
} = {}): Wiring {
  const w: Wiring = { updates: [], filters: [] };
  const row = { ...ROW, ...opts.row };
  from.mockImplementation((table: string) => {
    if (table === "car_partners") {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.partner === undefined ? PARTNER : opts.partner }) }),
        }),
      };
    }
    // car_requests
    const filtered = () => {
      const chain = {
        eq: (col: string, val: unknown) => { w.filters.push(["eq", col, val]); return chain; },
        is: (col: string, val: unknown) => { w.filters.push(["is", col, val]); return chain; },
        select: async () => ({ data: opts.writtenRows ?? [{ id: 25 }], error: opts.writeError ?? null }),
      };
      return chain;
    };
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      update: (patch: Record<string, unknown>) => { w.updates.push(patch); return filtered(); },
    };
  });
  return w;
}

describe("startDeposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fige l'option et l'acompte sur la demande : 412 EUR à 10 % = 41,20 EUR", async () => {
    const w = wiring();
    const out = await startDeposit(25, OPTION, "fr", NOW);

    expect(out).toEqual({ payUrl: "https://crete.direct/fr/car-booking/book-plain" });
    expect(w.updates).toHaveLength(1);
    expect(w.updates[0]).toMatchObject({
      quoted_price: 412,
      quoted_car_model: "Fiat Panda · Manual",
      quoted_inclusions: ["unlimited_km"],
      quoted_insurance_type: "cdw_excess",
      quoted_excess_eur: 800,
      quoted_zero_excess_upsell_eur_day: 9,
      quoted_by_partner_id: 111,
      partner_name: "Zorbas Rent a Car",
      quoted_at: "2027-07-10T08:00:00.000Z",
      deposit_option_id: 501,
      deposit_rate: 0.1,
      deposit_eur: 41.2,
      booking_token_hash: "deadbeefhash",
      booking_status: null,
    });
  });

  it("ne touche pas au statut : la demande reste « quoted » jusqu'au paiement", async () => {
    const w = wiring();
    await startDeposit(25, OPTION, "en", NOW);
    expect(w.updates[0]).not.toHaveProperty("status");
    expect(w.updates[0]).not.toHaveProperty("accepted_at");
    // Le lien d'offres du client doit rester vivant : il peut revenir choisir.
    expect(w.updates[0]).not.toHaveProperty("accept_token_hash");
  });

  it("seul le hash du jeton va en base, le clair ne passe que par l'URL", async () => {
    const w = wiring();
    await startDeposit(25, OPTION, "en", NOW);
    expect(JSON.stringify(w.updates)).not.toContain("book-plain");
  });

  it("écriture conditionnelle : verrou sur booking_status encore vide", async () => {
    const w = wiring();
    await startDeposit(25, OPTION, "en", NOW);
    expect(w.filters).toContainEqual(["eq", "id", 25]);
    expect(w.filters).toContainEqual(["is", "booking_status", null]);
    expect(w.filters).toContainEqual(["eq", "status", "quoted"]);
  });

  it.each(["sent", "accepted", "cancelled", "declined_by_client"])(
    "refuse not_quotable quand la demande est « %s », sans rien écrire",
    async (status) => {
      const w = wiring({ row: { status } });
      expect(await startDeposit(25, OPTION, "en", NOW)).toEqual({ error: "not_quotable" });
      expect(w.updates).toHaveLength(0);
    },
  );

  it.each(["pending_payment", "awaiting_partner", "confirmed", "cancelled_kept"])(
    "refuse in_progress quand booking_status vaut %s, sans rien écrire",
    async (status) => {
      const w = wiring({ row: { booking_status: status } });
      expect(await startDeposit(25, OPTION, "en", NOW)).toEqual({ error: "in_progress" });
      expect(w.updates).toHaveLength(0);
    },
  );

  it("refuse in_progress quand le verrou est perdu entre lecture et écriture", async () => {
    wiring({ writtenRows: [] });
    expect(await startDeposit(25, OPTION, "en", NOW)).toEqual({ error: "in_progress" });
  });

  it("après un remboursement, repart sur une autre offre et efface la réservation précédente", async () => {
    const w = wiring({ row: { booking_status: "refunded" } });
    const out = await startDeposit(25, OPTION, "en", NOW);

    expect(out).toEqual({ payUrl: "https://crete.direct/en/car-booking/book-plain" });
    for (const col of [
      "booking_session_id", "booking_payment_intent_id", "booking_paid_at",
      "confirm_deadline_at", "confirm_reminded_at", "partner_confirm_token",
      "partner_confirmed_at", "refund_reason", "refund_id", "refund_amount_eur", "cancelled_at",
    ]) {
      expect(w.updates[0]).toHaveProperty(col, null);
    }
    expect(w.updates[0].booking_status).toBeNull();
    // Verrou sur la valeur lue : un paiement parti entre-temps n'est pas écrasé.
    expect(w.filters).toContainEqual(["eq", "booking_status", "refunded"]);
  });

  it("too_close pour une prise dans 3 h", async () => {
    const w = wiring({ row: { date_from: "2027-07-12", time_from: "12:00" } });
    expect(await startDeposit(25, OPTION, "en", NOW)).toEqual({ error: "too_close" });
    expect(w.updates).toHaveLength(0);
  });

  it("too_close compte la durée de vie de la session Stripe (31 min)", async () => {
    // À 09:00 l'échéance tombe à 13:00 : une prise à 15:10 passe (marge de 2 h),
    // mais un paiement fait à 09:31, au bout de la session, la ferait tomber à
    // 13:31, au-delà de 13:10. On refuse dès le choix.
    wiring({ row: { date_from: "2027-07-12", time_from: "15:10" } });
    expect(await startDeposit(25, OPTION, "en", NOW)).toEqual({ error: "too_close" });
    wiring({ row: { date_from: "2027-07-12", time_from: "15:45" } });
    expect(await startDeposit(25, OPTION, "en", NOW)).toHaveProperty("payUrl");
  });

  it("une heure de prise absente compte pour 00:00 : on refuse plutôt qu'accepter trop tard", async () => {
    // Paiement à 20:00 : 2 h jusqu'à 22:00 puis 2 h dès 08:00, échéance 10:00 le lendemain.
    const evening = athensWallToUtcMs("2027-07-11", "20:00");
    wiring({ row: { date_from: "2027-07-12", time_from: null as unknown as string } });
    expect(await startDeposit(25, OPTION, "en", evening)).toEqual({ error: "too_close" });
    wiring({ row: { date_from: "2027-07-12", time_from: "18:00" } });
    expect(await startDeposit(25, OPTION, "en", evening)).toHaveProperty("payUrl");
  });

  it("below_minimum pour une option à 4 EUR (40 centimes d'acompte)", async () => {
    const w = wiring();
    expect(await startDeposit(25, { ...OPTION, price: 4 }, "en", NOW)).toEqual({ error: "below_minimum" });
    expect(w.updates).toHaveLength(0);
  });

  it("enregistre le téléphone résolu dans la même écriture", async () => {
    const w = wiring();
    await startDeposit(25, OPTION, "en", NOW, "+33 6 12 34 56 78");
    expect(w.updates[0].customer_phone).toBe("+33 6 12 34 56 78");
  });

  it("sans téléphone fourni, ne touche pas à celui de la demande", async () => {
    const w = wiring();
    await startDeposit(25, OPTION, "en", NOW);
    expect(w.updates[0]).not.toHaveProperty("customer_phone");
  });

  it("lève quand la base refuse l'écriture, jamais de lien de paiement", async () => {
    wiring({ writeError: { message: "permission denied" } });
    await expect(startDeposit(25, OPTION, "en", NOW)).rejects.toThrow(/permission denied/);
  });

  it("lève quand le loueur est illisible, plutôt que d'inventer un taux", async () => {
    wiring({ partner: null });
    await expect(startDeposit(25, OPTION, "en", NOW)).rejects.toThrow(/loueur/);
  });
});

describe("depositRatesFor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function partners(result: { data: unknown; error: { message: string } | null }) {
    const asked: unknown[] = [];
    from.mockImplementation(() => ({
      select: () => ({ in: async (_col: string, ids: unknown) => { asked.push(ids); return result; } }),
    }));
    return asked;
  }

  it("rend le taux de commission de chaque loueur présent", async () => {
    const asked = partners({ data: [{ id: 111, commission: 0.1 }, { id: 112, commission: "0.12" }], error: null });
    const rates = await depositRatesFor([111, 112, 111]);
    expect(asked[0]).toEqual([111, 112]);
    expect(rates.get(111)).toBe(0.1);
    expect(rates.get(112)).toBe(0.12);
  });

  it("aucun loueur : aucune lecture", async () => {
    partners({ data: [], error: null });
    expect((await depositRatesFor([])).size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("lecture refusée : carte vide, la page affiche les offres sans montant d'acompte", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    partners({ data: null, error: { message: "timeout" } });
    expect((await depositRatesFor([111])).size).toBe(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("onDepositSessionExpired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("libère la demande quand la session expirée est bien la sienne, toujours pending_payment", async () => {
    const w = wiring();
    expect(await onDepositSessionExpired(25, "cs_old")).toBe(true);
    expect(w.updates).toEqual([{ booking_status: null, booking_session_id: null }]);
    expect(w.filters).toEqual([
      ["eq", "id", 25],
      ["eq", "booking_status", "pending_payment"],
      ["eq", "booking_session_id", "cs_old"],
    ]);
  });

  it("autre session ou autre état : 0 ligne, rien de libéré", async () => {
    wiring({ writtenRows: [] });
    expect(await onDepositSessionExpired(25, "cs_other")).toBe(false);
  });

  it("lève quand la base refuse l'écriture", async () => {
    wiring({ writeError: { message: "permission denied" } });
    await expect(onDepositSessionExpired(25, "cs_old")).rejects.toThrow(/permission denied/);
  });
});

// ── Après paiement : fausse base en mémoire ────────────────────────────────
// Les transitions reposent sur des écritures conditionnelles : la fausse base
// applique réellement les filtres, pour que « confirmer deux fois » ou
// « confirmer après le remboursement » se jouent comme en production.

type Row = Record<string, unknown>;
type Filter = [string, string, unknown];
interface Op {
  table: string;
  kind: "select" | "update" | "delete";
  patch?: Row;
  filters: Filter[];
  columns?: string;
  returning?: string;
  head?: boolean;
  single?: boolean;
}

function matches(r: Row, [kind, col, val]: Filter): boolean {
  const v = r[col];
  switch (kind) {
    case "eq": return v === val;
    case "neq": return v != null && v !== val;
    case "is": return val === null ? v == null : v === val;
    case "in": return (val as unknown[]).includes(v);
    case "notnull": return v != null;
    case "lt": return v != null && String(v) < String(val);
    case "gt": return v != null && String(v) > String(val);
    case "gte": return v != null && String(v) >= String(val);
    default: throw new Error(`filtre non simulé: ${kind}`);
  }
}

function fakeDb(seed: Record<string, Row[]>, opts: { fail?: (op: Op) => string | null } = {}) {
  const tables: Record<string, Row[]> = JSON.parse(JSON.stringify(seed));
  const ops: Op[] = [];
  from.mockImplementation((table: string) => {
    const op: Op = { table, kind: "select", filters: [] };
    const run = () => {
      ops.push(op);
      const failure = opts.fail?.(op);
      if (failure) return { data: null, error: { message: failure }, count: null };
      const rows = (tables[table] ??= []);
      const hit = rows.filter((r) => op.filters.every((f) => matches(r, f)));
      if (op.kind === "update") {
        for (const r of hit) Object.assign(r, op.patch);
        return { data: op.returning !== undefined ? hit.map((r) => ({ ...r })) : null, error: null };
      }
      if (op.kind === "delete") {
        tables[table] = rows.filter((r) => !hit.includes(r));
        return { data: null, error: null };
      }
      if (op.head) return { data: null, error: null, count: hit.length };
      if (op.single) return { data: hit[0] ? { ...hit[0] } : null, error: null };
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const chain = {
      select(cols?: string, o?: { head?: boolean }) {
        if (op.kind === "select") { op.columns = cols; op.head = o?.head; } else op.returning = cols ?? "*";
        return chain;
      },
      update(patch: Row) { op.kind = "update"; op.patch = patch; return chain; },
      delete() { op.kind = "delete"; return chain; },
      eq(c: string, v: unknown) { op.filters.push(["eq", c, v]); return chain; },
      neq(c: string, v: unknown) { op.filters.push(["neq", c, v]); return chain; },
      is(c: string, v: unknown) { op.filters.push(["is", c, v]); return chain; },
      in(c: string, v: unknown[]) { op.filters.push(["in", c, v]); return chain; },
      not(c: string, operator: string, v: unknown) {
        if (operator !== "is" || v !== null) throw new Error("not() non simulé");
        op.filters.push(["notnull", c, null]);
        return chain;
      },
      gte(c: string, v: unknown) { op.filters.push(["gte", c, v]); return chain; },
      lt(c: string, v: unknown) { op.filters.push(["lt", c, v]); return chain; },
      gt(c: string, v: unknown) { op.filters.push(["gt", c, v]); return chain; },
      maybeSingle() { op.single = true; return Promise.resolve(run()); },
      then(res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) { return Promise.resolve(run()).then(res, rej); },
    };
    return chain;
  });
  const req = () => tables.car_requests[0];
  const invite = (id: number) => tables.car_quote_invites.find((i) => i.id === id)!;
  const updates = (table: string) => ops.filter((o) => o.table === table && o.kind === "update");
  return { tables, ops, req, invite, updates };
}

// Paiement le lundi 12/07/2027 à 21:30 heure d'Athènes.
const PAID_AT = athensWallToUtcMs("2027-07-12", "21:30");
const DEADLINE_ISO = new Date(athensWallToUtcMs("2027-07-13", "11:30")).toISOString();
const DAY = 86_400_000;

const REQ: Row = {
  id: 25,
  locale: "fr",
  status: "quoted",
  accepted_at: null,
  booking_status: "pending_payment",
  booking_session_id: "cs_1",
  booking_payment_intent_id: null,
  booking_paid_at: null,
  booking_token_hash: "bookhash",
  deposit_option_id: 501,
  deposit_eur: 41.2,
  quoted_price: 412,
  quoted_car_model: "Fiat Panda · Manual",
  quoted_insurance_type: "cdw_excess",
  quoted_excess_eur: 800,
  quoted_zero_excess_upsell_eur_day: 9,
  quoted_by_partner_id: 111,
  partner_name: "Zorbas Rent a Car",
  pickup_slug: "heraklion-airport",
  car_type: "compact",
  date_from: "2027-07-20",
  time_from: "10:00",
  date_to: "2027-07-27",
  time_to: "10:00",
  confirm_deadline_at: null,
  partner_confirm_token: null,
  partner_confirmed_at: null,
  refund_reason: null,
  refund_id: null,
  refund_amount_eur: null,
  cancelled_at: null,
  client_token: "client-tok",
  customer_name: "Marie Durand",
  customer_email: "marie@example.fr",
  customer_phone: "+33 6 12 34 56 78",
};

const AWAITING: Row = {
  ...REQ,
  status: "accepted",
  accepted_at: new Date(PAID_AT).toISOString(),
  booking_status: "awaiting_partner",
  booking_payment_intent_id: "pi_1",
  booking_paid_at: new Date(PAID_AT).toISOString(),
  confirm_deadline_at: DEADLINE_ISO,
  partner_confirm_token: "deadbeefhash",
};

const INVITES: Row[] = [
  { id: 77, request_id: 25, partner_id: 111, status: "quoted", deposit_failure_reason: null, deposit_failed_at: null },
  { id: 78, request_id: 25, partner_id: 112, status: "quoted", deposit_failure_reason: null, deposit_failed_at: null },
  { id: 79, request_id: 25, partner_id: 113, status: "declined", deposit_failure_reason: null, deposit_failed_at: null },
];
const AWAITING_INVITES: Row[] = [
  { ...INVITES[0], status: "chosen" },
  { ...INVITES[1], status: "not_chosen" },
  INVITES[2],
];

const PARTNERS: Row[] = [{
  id: 111,
  name: "Zorbas Rent a Car",
  email: "info@zorbas.gr",
  phone: "+30 2810 123456",
  whatsapp: null,
  address_line: "Airport road 1",
  postal_code: "71601",
  city: "Heraklion",
  rates_status: "live",
}];

function seed(request: Row, extra: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    car_requests: [request],
    car_quote_options: [{ id: 501, invite_id: 77, request_id: 25, partner_id: 111 }],
    car_quote_invites: request.booking_status === "pending_payment" ? INVITES : AWAITING_INVITES,
    car_partners: PARTNERS,
    car_commission_invoices: [],
    ...extra,
  } as Record<string, Row[]>;
}

// Jeton loueur : HMAC du secret d'admin sur la demande et le paiement (R41).
// Secret de test de 32 caractères (la prod en exige au moins 24).
const SECRET = "k".repeat(32);
const derived = (requestId: number, pi: string) =>
  createHmac("sha256", SECRET).update(`car-confirm-v1:${requestId}:${pi}`).digest("base64url");
const TOKEN = derived(25, "pi_1");

const mailsTo = (to: string) =>
  sendCarDepositMail.mock.calls.filter(([dest]) => dest === to).map(([, m]) => m as { subject: string; html: string });

const opsTitles = () => notifyOps.mock.calls.map(([n]) => (n as { title: string }).title);

describe("après paiement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CAR_ADMIN_SECRET", SECRET);
    refundsCreate.mockReset();
    refundsCreate.mockResolvedValue({ id: "re_1", amount: 4120 });
    refundsList.mockReset();
    refundsList.mockResolvedValue({ data: [] });
    notifyOps.mockResolvedValue(true);
    sendCarDepositMail.mockReset();
    sendCarDepositMail.mockResolvedValue(true);
    sendCreditNote.mockResolvedValue(true);
  });
  afterEach(() => vi.unstubAllEnvs());

  describe("partnerConfirmUrl", () => {
    it("déterministe : même demande et même paiement, même lien", () => {
      expect(partnerConfirmUrl(25, "pi_1")).toBe(`https://crete.direct/en/car-confirm/${TOKEN}`);
      expect(partnerConfirmUrl(25, "pi_1")).toBe(partnerConfirmUrl(25, "pi_1"));
    });

    it("change avec la demande et avec le paiement", () => {
      const urls = new Set([partnerConfirmUrl(25, "pi_1"), partnerConfirmUrl(26, "pi_1"), partnerConfirmUrl(25, "pi_2")]);
      expect(urls.size).toBe(3);
    });

    it("change avec le secret : sans lui, personne ne fabrique un lien", () => {
      const before = partnerConfirmUrl(25, "pi_1");
      vi.stubEnv("CAR_ADMIN_SECRET", "j".repeat(32));
      expect(partnerConfirmUrl(25, "pi_1")).not.toBe(before);
    });

    it("lève sans secret", () => {
      vi.stubEnv("CAR_ADMIN_SECRET", "");
      expect(() => partnerConfirmUrl(25, "pi_1")).toThrow(/CAR_ADMIN_SECRET/);
    });
  });

  describe("onDepositPaid", () => {
    it("écrit l'échéance attendue pour un paiement à 21:30 heure d'Athènes (11:30 le lendemain)", async () => {
      const db = fakeDb(seed(REQ));
      expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).toBe("recorded");
      expect(db.req()).toMatchObject({
        booking_status: "awaiting_partner",
        booking_payment_intent_id: "pi_1",
        booking_paid_at: new Date(PAID_AT).toISOString(),
        confirm_deadline_at: DEADLINE_ISO,
        status: "accepted",
        accepted_at: new Date(PAID_AT).toISOString(),
        partner_confirm_token: "deadbeefhash",
      });
    });

    it("prise de main conditionnelle : session ET état pending_payment", async () => {
      const db = fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      const claim = db.updates("car_requests")[0];
      expect(claim.filters).toContainEqual(["eq", "booking_session_id", "cs_1"]);
      expect(claim.filters).toContainEqual(["eq", "booking_status", "pending_payment"]);
      expect(claim.returning).toBeDefined();
    });

    it("le jeton loueur n'est stocké que haché, le clair ne part que dans le lien de l'e-mail", async () => {
      const db = fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      expect(JSON.stringify(db.tables)).not.toContain(TOKEN);
      const [partnerMail] = mailsTo("info@zorbas.gr");
      expect(partnerMail.html).toContain(`https://crete.direct/en/car-confirm/${TOKEN}`);
    });

    it("le hash stocké est celui du jeton dérivé de la demande et du paiement", async () => {
      const db = fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      expect(hashToken).toHaveBeenCalledWith(TOKEN);
      expect(db.req().partner_confirm_token).toBe("deadbeefhash");
    });

    it("sans secret : lève avant toute écriture, aucun e-mail (Stripe rejouera)", async () => {
      vi.stubEnv("CAR_ADMIN_SECRET", "");
      const db = fakeDb(seed(REQ));
      await expect(onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).rejects.toThrow(/CAR_ADMIN_SECRET/);
      expect(db.ops).toHaveLength(0);
      expect(db.req().booking_status).toBe("pending_payment");
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("un envoi qui lève (rendu ou module e-mail) ne remonte pas : ops prévenu, état gardé", async () => {
      const db = fakeDb(seed(REQ));
      sendCarDepositMail.mockRejectedValue(new Error("resend exploded"));
      expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).toBe("recorded");
      expect(db.req().booking_status).toBe("awaiting_partner");
      const lines = (notifyOps.mock.calls.at(-1)![0] as { lines: string[] }).lines.join("\n");
      expect(lines).toContain("e-mail client_pending au client non parti : resend exploded");
      expect(lines).toContain(`/en/car-confirm/${TOKEN}`);
    });

    it("l'invitation de l'option payée passe chosen, les autres devis not_chosen", async () => {
      const db = fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      expect(db.invite(77).status).toBe("chosen");
      expect(db.invite(78).status).toBe("not_chosen");
      expect(db.invite(79).status).toBe("declined");
    });

    it("prévient le client, le loueur (sans coordonnées du client) et ops", async () => {
      fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      const [client] = mailsTo("marie@example.fr");
      expect(client.subject).toContain("en attente de confirmation");
      expect(client.html).not.toContain("+30 2810 123456");
      const [partner] = mailsTo("info@zorbas.gr");
      for (const c of ["Marie Durand", "+33 6 12 34 56 78", "marie@example.fr"]) {
        expect(partner.html).not.toContain(c);
        expect(partner.subject).not.toContain(c);
      }
      expect(sendCarDepositMail).toHaveBeenCalledTimes(2);
      expect(opsTitles()).toHaveLength(1);
      expect(opsTitles()[0]).toMatch(/^Acompte voiture payé : Zorbas Rent a Car doit confirmer avant .*11:30/);
    });

    it("seconde livraison du même paiement : recorded, aucun second e-mail, aucun remboursement", async () => {
      fakeDb(seed(REQ));
      await onDepositPaid(25, "cs_1", "pi_1", PAID_AT);
      expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT + 60_000)).toBe("recorded");
      expect(sendCarDepositMail).toHaveBeenCalledTimes(2);
      expect(refundsCreate).not.toHaveBeenCalled();
    });

    it.each(["confirmed", "refunded", "cancelled_kept"])(
      "paiement déjà enregistré puis passé %s : recorded sans rien réécrire",
      async (status) => {
        const db = fakeDb(seed({ ...AWAITING, booking_status: status }));
        expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).toBe("recorded");
        expect(db.req().booking_status).toBe(status);
        expect(sendCarDepositMail).not.toHaveBeenCalled();
        expect(refundsCreate).not.toHaveBeenCalled();
      },
    );

    it("session étrangère : rembourse ce paiement, n'écrit pas awaiting_partner, alerte ops", async () => {
      const db = fakeDb(seed({ ...REQ, booking_session_id: "cs_other" }));
      expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).toBe("session_mismatch");
      expect(refundsCreate).toHaveBeenCalledTimes(1);
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_1" },
        { idempotencyKey: "car-deposit-mismatch-pi_1" },
      );
      expect(db.req().booking_status).toBe("pending_payment");
      expect(db.req().booking_payment_intent_id).toBeNull();
      expect(db.invite(77).status).toBe("quoted");
      expect(sendCarDepositMail).not.toHaveBeenCalled();
      expect(opsTitles()[0]).toMatch(/session/i);
    });

    it("second paiement sur une demande déjà payée par une autre session : remboursé", async () => {
      const db = fakeDb(seed({ ...AWAITING, booking_session_id: "cs_first" }));
      expect(await onDepositPaid(25, "cs_second", "pi_2", PAID_AT)).toBe("session_mismatch");
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_2" },
        { idempotencyKey: "car-deposit-mismatch-pi_2" },
      );
      expect(db.req().booking_payment_intent_id).toBe("pi_1");
    });

    it("un e-mail refusé ne défait pas l'état et prévient ops", async () => {
      const db = fakeDb(seed(REQ));
      sendCarDepositMail.mockImplementation(async (to: string) => to !== "info@zorbas.gr");
      expect(await onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).toBe("recorded");
      expect(db.req().booking_status).toBe("awaiting_partner");
      const alert = notifyOps.mock.calls.map(([n]) => JSON.stringify(n)).join("\n");
      expect(alert).toMatch(/loueur/);
      // Ops transmet le lien au loueur.
      expect(alert).toContain(`/en/car-confirm/${TOKEN}`);
    });

    it("lève quand la base refuse la prise de main (le webhook rendra 500)", async () => {
      fakeDb(seed(REQ), { fail: (op) => (op.table === "car_requests" && op.kind === "update" ? "permission denied" : null) });
      await expect(onDepositPaid(25, "cs_1", "pi_1", PAID_AT)).rejects.toThrow(/permission denied/);
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });
  });

  describe("confirmBooking", () => {
    it("awaiting_partner → confirmed, coordonnées échangées dans les deux sens", async () => {
      const db = fakeDb(seed(AWAITING));
      expect(await confirmBooking(25, "partner")).toBe("confirmed");
      expect(db.req().booking_status).toBe("confirmed");
      expect(db.req().partner_confirmed_at).toEqual(expect.any(String));
      const [client] = mailsTo("marie@example.fr");
      expect(client.html).toContain("+30 2810 123456");
      expect(client.html).toContain("Airport road 1, 71601 Heraklion");
      const [partner] = mailsTo("info@zorbas.gr");
      expect(partner.html).toContain("Marie Durand");
      expect(partner.html).toContain("+33 6 12 34 56 78");
      expect(partner.html).toContain("marie@example.fr");
    });

    it("deux fois : already_confirmed au second appel, un seul envoi d'e-mails", async () => {
      fakeDb(seed(AWAITING));
      expect(await confirmBooking(25, "partner")).toBe("confirmed");
      expect(await confirmBooking(25, "partner")).toBe("already_confirmed");
      expect(sendCarDepositMail).toHaveBeenCalledTimes(2);
    });

    it("après releaseBooking : not_awaiting, aucune coordonnée envoyée", async () => {
      const db = fakeDb(seed(AWAITING));
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("refunded");
      sendCarDepositMail.mockClear();
      expect(await confirmBooking(25, "partner")).toBe("not_awaiting");
      expect(db.req().booking_status).toBe("refunded");
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("échéance dépassée mais demande encore awaiting_partner (cron pas encore passé) : acceptée", async () => {
      const db = fakeDb(seed({ ...AWAITING, confirm_deadline_at: "2020-01-01T00:00:00.000Z" }));
      expect(await confirmBooking(25, "partner")).toBe("confirmed");
      expect(db.req().booking_status).toBe("confirmed");
    });

    it("prise de main conditionnelle sur awaiting_partner", async () => {
      const db = fakeDb(seed(AWAITING));
      await confirmBooking(25, "admin");
      expect(db.updates("car_requests")[0].filters).toContainEqual(["eq", "booking_status", "awaiting_partner"]);
    });

    it("un e-mail refusé ne défait pas la confirmation et prévient ops", async () => {
      const db = fakeDb(seed(AWAITING));
      sendCarDepositMail.mockResolvedValue(false);
      expect(await confirmBooking(25, "partner")).toBe("confirmed");
      expect(db.req().booking_status).toBe("confirmed");
      expect(JSON.stringify(notifyOps.mock.calls)).toMatch(/e-mail/i);
    });
  });

  describe("releaseBooking", () => {
    it("rembourse une fois, remet la demande en offres, l'invitation fautive passe declined", async () => {
      const now = PAID_AT + DAY;
      const db = fakeDb(seed(AWAITING));
      expect(await releaseBooking(25, "partner_timeout", now)).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledTimes(1);
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_1" },
        { idempotencyKey: `car-deposit-refund-25-pi_1-${now}` },
      );
      expect(db.req()).toMatchObject({
        booking_status: "refunded",
        refund_reason: "partner_timeout",
        refund_id: "re_1",
        refund_amount_eur: 41.2,
        cancelled_at: new Date(now).toISOString(),
        status: "quoted",
        accepted_at: null,
      });
      expect(db.invite(77)).toMatchObject({
        status: "declined",
        deposit_failure_reason: "partner_timeout",
        deposit_failed_at: new Date(now).toISOString(),
      });
      expect(db.invite(78).status).toBe("quoted");
      expect(db.invite(79).status).toBe("declined");
    });

    it("garde le jeton de réservation : la vue « remboursé » reste lisible par le lien du client (R5)", async () => {
      const db = fakeDb(seed(AWAITING));
      await releaseBooking(25, "partner_declined", PAID_AT + DAY);
      expect(db.req().booking_token_hash).toBe("bookhash");
      for (const u of db.updates("car_requests")) expect(u.patch).not.toHaveProperty("booking_token_hash");
    });

    it("prend la main AVANT d'appeler Stripe : « Confirm » et le cron ne gagnent pas tous les deux", async () => {
      const db = fakeDb(seed(AWAITING));
      const seen: unknown[] = [];
      refundsCreate.mockImplementation(async () => {
        seen.push(db.req().booking_status);
        return { id: "re_1", amount: 4120 };
      });
      await releaseBooking(25, "partner_timeout", PAID_AT + DAY);
      expect(seen).toEqual(["refunded"]);
      expect(db.updates("car_requests")[0].filters).toContainEqual(["eq", "booking_status", "awaiting_partner"]);
    });

    it("client_refunded part avec le motif et le lien des autres offres", async () => {
      fakeDb(seed(AWAITING));
      await releaseBooking(25, "partner_declined", PAID_AT + DAY);
      const [client] = mailsTo("marie@example.fr");
      expect(client.html).toContain("Le loueur n'a pas pu confirmer cette voiture.");
      expect(client.html).toContain("https://crete.direct/fr/car-offer/client-tok");
      expect(mailsTo("info@zorbas.gr")).toHaveLength(0);
    });

    it("Stripe refuse : retour à awaiting_partner, refund_failed, aucun e-mail, ops prévenu", async () => {
      const db = fakeDb(seed(AWAITING));
      refundsCreate.mockRejectedValue(new Error("api down"));
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("refund_failed");
      expect(refundsList).toHaveBeenCalledWith({ payment_intent: "pi_1", limit: 10 });
      expect(db.req()).toMatchObject({
        booking_status: "awaiting_partner", refund_reason: null, cancelled_at: null, status: "accepted",
      });
      expect(db.invite(77)).toMatchObject({ status: "chosen", deposit_failure_reason: null });
      expect(sendCarDepositMail).not.toHaveBeenCalled();
      expect(opsTitles().some((t) => /rembours/i.test(t))).toBe(true);
    });

    it("la prise de main écrit cancelled_at ; la clé d'idempotence porte cet instant", async () => {
      const now = PAID_AT + DAY;
      const db = fakeDb(seed(AWAITING));
      await releaseBooking(25, "partner_timeout", now);
      expect(db.updates("car_requests")[0].patch).toEqual({
        booking_status: "refunded", refund_reason: "partner_timeout", cancelled_at: new Date(now).toISOString(),
      });
      // Deux prises successives (après un retour arrière) ne partagent pas de clé :
      // Stripe garderait 24 h l'erreur de la première.
      const [, { idempotencyKey }] = refundsCreate.mock.calls[0] as [unknown, { idempotencyKey: string }];
      expect(idempotencyKey.endsWith(`-${now}`)).toBe(true);
    });

    it.each([
      ["réponse perdue", new Error("socket hang up")],
      ["déjà remboursé à la main", Object.assign(new Error("Charge ch_1 has already been refunded."), { code: "charge_already_refunded" })],
    ])("create lève (%s) mais Stripe a un remboursement : chemin du succès, aucun retour arrière", async (_label, err) => {
      const db = fakeDb(seed(AWAITING));
      refundsCreate.mockRejectedValue(err);
      refundsList.mockResolvedValue({ data: [{ id: "re_manual", status: "succeeded" }] });
      expect(await releaseBooking(25, "partner_declined", PAID_AT + DAY)).toBe("refunded");
      expect(db.req()).toMatchObject({ booking_status: "refunded", refund_id: "re_manual", status: "quoted" });
      expect(db.updates("car_requests").some((u) => u.patch?.booking_status === "awaiting_partner")).toBe(false);
      expect(db.invite(77).status).toBe("declined");
      expect(mailsTo("marie@example.fr")).toHaveLength(1);
      expect(opsTitles().some((t) => /refusé/.test(t))).toBe(false);
    });

    it("un remboursement failed ou canceled ne compte pas : retour arrière", async () => {
      const db = fakeDb(seed(AWAITING));
      refundsCreate.mockRejectedValue(new Error("api down"));
      refundsList.mockResolvedValue({ data: [{ id: "re_x", status: "failed" }, { id: "re_y", status: "canceled" }] });
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("refund_failed");
      expect(db.req()).toMatchObject({ booking_status: "awaiting_partner", refund_id: null });
    });

    it("create et list lèvent : retour arrière comme avant", async () => {
      const db = fakeDb(seed(AWAITING));
      refundsCreate.mockRejectedValue(new Error("api down"));
      refundsList.mockRejectedValue(new Error("api still down"));
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("refund_failed");
      expect(db.req()).toMatchObject({ booking_status: "awaiting_partner", refund_reason: null, cancelled_at: null });
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("remboursé puis inscription refusée par la base : alerte qui sonne, aucun second remboursement, la reprise finit", async () => {
      let broken = true;
      const db = fakeDb(seed(AWAITING), {
        fail: (op) => (broken && op.table === "car_requests" && op.kind === "update" && op.patch && "refund_id" in op.patch ? "timeout" : null),
      });
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledTimes(1);
      const alert = notifyOps.mock.calls.at(-1)![0] as { title: string; silent?: boolean };
      expect(alert.title).toMatch(/non inscrit/);
      expect(alert.silent).toBeFalsy();
      expect(db.req()).toMatchObject({ booking_status: "refunded", refund_id: null });
      // Rien d'envoyé tant que le remboursement n'est pas inscrit : la reprise le fera une fois.
      expect(sendCarDepositMail).not.toHaveBeenCalled();

      broken = false;
      refundsList.mockResolvedValue({ data: [{ id: "re_1", status: "succeeded" }] });
      expect(await resumeClaimedRefund(25, PAID_AT + DAY + 20 * 60_000)).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledTimes(1);
      expect(db.req()).toMatchObject({ refund_id: "re_1", status: "quoted" });
      expect(mailsTo("marie@example.fr")).toHaveLength(1);
    });

    it("après une confirmation : not_releasable, aucun remboursement", async () => {
      const db = fakeDb(seed(AWAITING));
      await confirmBooking(25, "partner");
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("not_releasable");
      expect(refundsCreate).not.toHaveBeenCalled();
      expect(db.req().booking_status).toBe("confirmed");
    });

    it("deux fois : un seul remboursement", async () => {
      fakeDb(seed(AWAITING));
      expect(await releaseBooking(25, "partner_declined", PAID_AT + DAY)).toBe("refunded");
      expect(await releaseBooking(25, "partner_timeout", PAID_AT + DAY)).toBe("not_releasable");
      expect(refundsCreate).toHaveBeenCalledTimes(1);
    });

    it.each(["ops", "client_cancelled"] as const)(
      "motif %s : pas un manquement du loueur, son invitation repasse quoted sans trace d'échec",
      async (reason) => {
        const db = fakeDb(seed(AWAITING));
        expect(await releaseBooking(25, reason, PAID_AT + DAY)).toBe("refunded");
        expect(db.invite(77)).toMatchObject({ status: "quoted", deposit_failure_reason: null, deposit_failed_at: null });
        expect(db.ops.some((o) => o.table === "car_quote_invites" && o.head)).toBe(false);
        expect(db.tables.car_partners[0].rates_status).toBe("live");
      },
    );

    const pastFailure = (id: number, daysAgo: number): Row => ({
      id, request_id: 900 + id, partner_id: 111, status: "declined",
      deposit_failure_reason: "partner_declined",
      deposit_failed_at: new Date(PAID_AT + DAY - daysAgo * DAY).toISOString(),
    });

    it("au 3e manquement en 30 jours, la grille passe paused et ops est prévenu une fois", async () => {
      const db = fakeDb(seed(AWAITING, {
        car_quote_invites: [...AWAITING_INVITES, pastFailure(1, 3), pastFailure(2, 20)],
      }));
      await releaseBooking(25, "partner_timeout", PAID_AT + DAY);
      expect(db.tables.car_partners[0].rates_status).toBe("paused");
      expect(opsTitles().filter((t) => /suspendu/i.test(t))).toHaveLength(1);
      const pause = db.updates("car_partners")[0];
      expect(pause.filters).toContainEqual(["neq", "rates_status", "paused"]);
    });

    it("2 manquements seulement, ou un ancien hors fenêtre : pas de suspension", async () => {
      const db = fakeDb(seed(AWAITING, {
        car_quote_invites: [...AWAITING_INVITES, pastFailure(1, 3), pastFailure(2, 31)],
      }));
      await releaseBooking(25, "partner_declined", PAID_AT + DAY);
      expect(db.tables.car_partners[0].rates_status).toBe("live");
      expect(opsTitles().filter((t) => /suspendu/i.test(t))).toHaveLength(0);
    });

    it("grille déjà paused : aucune seconde alerte", async () => {
      const db = fakeDb(seed(AWAITING, {
        car_quote_invites: [...AWAITING_INVITES, pastFailure(1, 3), pastFailure(2, 20), pastFailure(3, 25)],
        car_partners: [{ ...PARTNERS[0], rates_status: "paused" }],
      }));
      await releaseBooking(25, "partner_declined", PAID_AT + DAY);
      expect(db.tables.car_partners[0].rates_status).toBe("paused");
      expect(opsTitles().filter((t) => /suspendu/i.test(t))).toHaveLength(0);
    });

    it("lève quand la base refuse la prise de main, sans appeler Stripe", async () => {
      fakeDb(seed(AWAITING), { fail: (op) => (op.table === "car_requests" && op.kind === "update" ? "timeout" : null) });
      await expect(releaseBooking(25, "partner_timeout", PAID_AT + DAY)).rejects.toThrow(/timeout/);
      expect(refundsCreate).not.toHaveBeenCalled();
    });
  });

  describe("refundConfirmed", () => {
    const CONFIRMED: Row = { ...AWAITING, booking_status: "confirmed", partner_confirmed_at: "2027-07-13T06:00:00.000Z" };
    const INVOICE: Row = {
      id: 9, number: "NOVAI-2027-001", request_id: 25, partner_id: 111, base_amount_eur: 412, rate: 0.1,
      amount_eur: 41.2, issued_at: "2027-07-20T05:00:00.000Z", sent_at: null, paid_at: "2027-07-20T05:00:00.000Z",
      credited_at: null, credit_number: null, credit_reason: null,
    };

    it("loueur qui annule après confirmation : remboursé, manquement consigné, avoir émis", async () => {
      const db = fakeDb(seed(CONFIRMED, { car_commission_invoices: [INVOICE] }));
      expect(await refundConfirmed(25, "partner_cancelled")).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_1" },
        { idempotencyKey: `car-deposit-refund-confirmed-25-pi_1-${Date.parse(db.req().cancelled_at as string)}` },
      );
      expect(db.req()).toMatchObject({
        booking_status: "refunded", refund_reason: "partner_cancelled", refund_id: "re_1", refund_amount_eur: 41.2,
      });
      expect(db.invite(77)).toMatchObject({ status: "declined", deposit_failure_reason: "partner_cancelled" });
      expect(db.tables.car_commission_invoices[0].credited_at).toEqual(expect.any(String));
      expect(sendCreditNote).toHaveBeenCalledTimes(1);
      expect(mailsTo("marie@example.fr")).toHaveLength(1);
      // Tout s'est bien passé : ops est informé sans sonnerie, avoir nommé.
      const notice = notifyOps.mock.calls.at(-1)![0] as { silent?: boolean; lines: string[] };
      expect(notice.silent).toBe(true);
      expect(notice.lines.join("\n")).toMatch(/avoir .* émis et envoyé/);
    });

    it("sans facture : aucun avoir", async () => {
      fakeDb(seed(CONFIRMED));
      expect(await refundConfirmed(25, "ops")).toBe("refunded");
      expect(sendCreditNote).not.toHaveBeenCalled();
    });

    it("facture illisible : un échec qui sonne, jamais « aucune facture »", async () => {
      fakeDb(seed(CONFIRMED, { car_commission_invoices: [INVOICE] }), {
        fail: (op) => (op.table === "car_commission_invoices" && op.kind === "select" ? "timeout" : null),
      });
      expect(await refundConfirmed(25, "partner_cancelled")).toBe("refunded");
      const notice = notifyOps.mock.calls.at(-1)![0] as { silent?: boolean; lines: string[] };
      expect(notice.silent).toBe(false);
      expect(notice.lines.join("\n")).toMatch(/facture de commission illisible \(timeout\)/);
      expect(notice.lines.join("\n")).not.toMatch(/aucune facture/);
      expect(sendCreditNote).not.toHaveBeenCalled();
    });

    it("motif ops : l'invitation repasse quoted, pas de manquement", async () => {
      const db = fakeDb(seed(CONFIRMED));
      await refundConfirmed(25, "ops");
      expect(db.invite(77)).toMatchObject({ status: "quoted", deposit_failure_reason: null });
    });

    it("pas encore confirmée : not_refundable, aucun remboursement", async () => {
      fakeDb(seed(AWAITING));
      expect(await refundConfirmed(25, "ops")).toBe("not_refundable");
      expect(refundsCreate).not.toHaveBeenCalled();
    });

    it("Stripe refuse : retour à confirmed, refund_failed, aucun e-mail", async () => {
      const db = fakeDb(seed(CONFIRMED, { car_commission_invoices: [INVOICE] }));
      refundsCreate.mockRejectedValue(new Error("api down"));
      expect(await refundConfirmed(25, "partner_cancelled")).toBe("refund_failed");
      expect(db.req()).toMatchObject({ booking_status: "confirmed", refund_reason: null });
      expect(db.tables.car_commission_invoices[0].credited_at).toBeNull();
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });
  });

  describe("resumeClaimedRefund", () => {
    const CLAIM_MS = PAID_AT + DAY;
    const STUCK: Row = {
      ...AWAITING,
      booking_status: "refunded",
      refund_reason: "partner_timeout",
      cancelled_at: new Date(CLAIM_MS).toISOString(),
    };
    const LATER = CLAIM_MS + 20 * 60_000;

    it("remboursement déjà chez Stripe : finit sans en créer, mêmes étapes que l'original", async () => {
      const db = fakeDb(seed(STUCK));
      refundsList.mockResolvedValue({ data: [{ id: "re_9", status: "succeeded" }] });
      expect(await resumeClaimedRefund(25, LATER)).toBe("refunded");
      expect(refundsCreate).not.toHaveBeenCalled();
      expect(db.req()).toMatchObject({ booking_status: "refunded", refund_id: "re_9", refund_amount_eur: 41.2, status: "quoted" });
      expect(db.invite(77)).toMatchObject({ status: "declined", deposit_failure_reason: "partner_timeout" });
      expect(db.invite(78).status).toBe("quoted");
      expect(mailsTo("marie@example.fr")).toHaveLength(1);
      expect(opsTitles().at(-1)).toMatch(/^Acompte voiture remboursé/);
    });

    it("aucun remboursement chez Stripe : create avec la clé reconstruite depuis cancelled_at", async () => {
      const db = fakeDb(seed(STUCK));
      expect(await resumeClaimedRefund(25, LATER)).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_1" },
        { idempotencyKey: `car-deposit-refund-25-pi_1-${CLAIM_MS}` },
      );
      expect(db.req().refund_id).toBe("re_1");
    });

    it("réservation confirmée interrompue : clé « confirmed » et avoir de la facture", async () => {
      const invoice: Row = {
        id: 9, number: "NOVAI-2027-001", request_id: 25, partner_id: 111, amount_eur: 41.2, credited_at: null,
      };
      const db = fakeDb(seed({ ...STUCK, refund_reason: "partner_cancelled", partner_confirmed_at: "2027-07-13T06:00:00.000Z" }, {
        car_commission_invoices: [invoice],
      }));
      expect(await resumeClaimedRefund(25, LATER)).toBe("refunded");
      expect(refundsCreate).toHaveBeenCalledWith(
        { payment_intent: "pi_1" },
        { idempotencyKey: `car-deposit-refund-confirmed-25-pi_1-${CLAIM_MS}` },
      );
      expect(db.tables.car_commission_invoices[0].credited_at).toEqual(expect.any(String));
      expect(sendCreditNote).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["en attente du loueur", { ...AWAITING }],
      ["déjà inscrit", { ...STUCK, refund_id: "re_1" }],
      ["confirmée", { ...AWAITING, booking_status: "confirmed" }],
    ])("ligne pas bloquée (%s) : not_stuck, aucun appel Stripe", async (_label, request) => {
      fakeDb(seed(request as Row));
      expect(await resumeClaimedRefund(25, LATER)).toBe("not_stuck");
      expect(refundsList).not.toHaveBeenCalled();
      expect(refundsCreate).not.toHaveBeenCalled();
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("prise de main de moins de 15 minutes : not_stuck, aucun appel Stripe", async () => {
      fakeDb(seed(STUCK));
      expect(await resumeClaimedRefund(25, CLAIM_MS + 5 * 60_000)).toBe("not_stuck");
      expect(refundsList).not.toHaveBeenCalled();
      expect(refundsCreate).not.toHaveBeenCalled();
    });

    it("base refuse l'inscription : l'alerte interdit d'écrire refund_id à la main", async () => {
      fakeDb(seed(STUCK), { fail: (op) => (op.table === "car_requests" && op.kind === "update" ? "db down" : null) });
      refundsList.mockResolvedValue({ data: [{ id: "re_9", status: "succeeded" }] });
      expect(await resumeClaimedRefund(25, LATER)).toBe("refunded");
      const alert = notifyOps.mock.calls.at(-1)![0] as { action: string };
      expect(alert.action).toMatch(/ne rien écrire à la main/);
    });

    it("échec : ops prévenu, ligne laissée telle quelle (aucun retour arrière)", async () => {
      const db = fakeDb(seed(STUCK));
      refundsCreate.mockRejectedValue(new Error("api down"));
      expect(await resumeClaimedRefund(25, LATER)).toBe("refund_failed");
      expect(db.updates("car_requests")).toHaveLength(0);
      expect(db.req()).toMatchObject({ booking_status: "refunded", refund_id: null, cancelled_at: STUCK.cancelled_at });
      expect(opsTitles()).toEqual(["Acompte voiture : remboursement pris en main mais toujours pas fait"]);
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("deux reprises : un seul e-mail au client", async () => {
      fakeDb(seed(STUCK));
      expect(await resumeClaimedRefund(25, LATER)).toBe("refunded");
      expect(await resumeClaimedRefund(25, LATER)).toBe("not_stuck");
      expect(mailsTo("marie@example.fr")).toHaveLength(1);
    });
  });

  describe("remindPartner", () => {
    const DUE = PAID_AT + 60 * 60_000;

    it("rappel : lien reconstruit, e-mail au loueur, confirm_reminded_at écrit", async () => {
      const db = fakeDb(seed(AWAITING));
      expect(await remindPartner(25, DUE)).toBe("reminded");
      expect(db.req().confirm_reminded_at).toBe(new Date(DUE).toISOString());
      const mails = mailsTo("info@zorbas.gr");
      expect(mails).toHaveLength(1);
      expect(mails[0].html).toContain(partnerConfirmUrl(25, "pi_1"));
    });

    it("prise de main perdue (déjà rappelé) : 0 e-mail", async () => {
      fakeDb(seed({ ...AWAITING, confirm_reminded_at: "2027-07-12T20:00:00.000Z" }));
      expect(await remindPartner(25, DUE)).toBe("not_claimed");
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("échéance passée : pas de rappel", async () => {
      fakeDb(seed(AWAITING));
      expect(await remindPartner(25, Date.parse(DEADLINE_ISO) + 1)).toBe("not_claimed");
      expect(sendCarDepositMail).not.toHaveBeenCalled();
    });

    it("envoi refusé : ops prévenu avec le lien, rappel non retenté", async () => {
      const db = fakeDb(seed(AWAITING));
      sendCarDepositMail.mockResolvedValue(false);
      expect(await remindPartner(25, DUE)).toBe("reminder_failed");
      expect(JSON.stringify(notifyOps.mock.calls.at(-1))).toContain(partnerConfirmUrl(25, "pi_1"));
      expect(db.req().confirm_reminded_at).not.toBeNull();
    });
  });

  describe("bookingByConfirmToken", () => {
    it("cherche par le hash du jeton, sans lire aucune coordonnée du client", async () => {
      const db = fakeDb(seed(AWAITING));
      const b = await bookingByConfirmToken("conf-plain");
      expect(b?.id).toBe(25);
      const read = db.ops[0];
      expect(read.filters).toEqual([["eq", "partner_confirm_token", "deadbeefhash"]]);
      expect(read.columns).not.toMatch(/customer_/);
    });

    it("jeton inconnu : null", async () => {
      fakeDb(seed({ ...AWAITING, partner_confirm_token: "other" }));
      expect(await bookingByConfirmToken("conf-plain")).toBeNull();
    });

    it("lève quand la lecture est refusée", async () => {
      fakeDb(seed(AWAITING), { fail: () => "timeout" });
      await expect(bookingByConfirmToken("conf-plain")).rejects.toThrow(/timeout/);
    });
  });
});
