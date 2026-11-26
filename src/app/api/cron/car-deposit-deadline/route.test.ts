import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
type Filter = [string, string, unknown];

const { from, releaseBooking, resumeClaimedRefund, remindPartner, reconcilePendingDeposit, notifyOps } = vi.hoisted(() => ({
  from: vi.fn(),
  releaseBooking: vi.fn(),
  resumeClaimedRefund: vi.fn(),
  remindPartner: vi.fn(),
  reconcilePendingDeposit: vi.fn(),
  notifyOps: vi.fn(),
}));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("@/lib/car-deposit-server", () => ({ releaseBooking, resumeClaimedRefund, remindPartner, reconcilePendingDeposit }));
vi.mock("@/lib/ops-notify", () => ({ notifyOps }));

import { GET } from "./route";

const NOW = Date.parse("2027-07-13T08:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;

let rows: Row[] = [];
let limits: number[] = [];

/** Base simulée : eq, is, lt, gt, order, limit sur une seule table. */
function fakeDb() {
  from.mockImplementation(() => {
    const filters: Filter[] = [];
    let max = Infinity;
    const chain = {
      select: () => chain,
      eq: (c: string, v: unknown) => (filters.push(["eq", c, v]), chain),
      is: (c: string, v: unknown) => (filters.push(["is", c, v]), chain),
      not: (c: string, op: string, v: unknown) => {
        if (op !== "is" || v !== null) throw new Error("not() non simulé");
        return (filters.push(["notnull", c, null]), chain);
      },
      lt: (c: string, v: unknown) => (filters.push(["lt", c, v]), chain),
      gt: (c: string, v: unknown) => (filters.push(["gt", c, v]), chain),
      order: () => chain,
      limit: (n: number) => ((max = n), limits.push(n), chain),
      then: (res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        const hit = rows.filter((r) =>
          filters.every(([k, c, v]) => {
            const x = r[c];
            if (k === "eq") return x === v;
            if (k === "is") return v === null ? x == null : x === v;
            if (k === "notnull") return x != null;
            if (k === "lt") return x != null && String(x) < String(v);
            return x != null && String(x) > String(v);
          }),
        );
        return Promise.resolve({ data: hit.slice(0, max), error: null }).then(res, rej);
      },
    };
    return chain;
  });
}

const req = (secret?: string) =>
  new NextRequest("https://crete.direct/api/cron/car-deposit-deadline", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });

const awaiting = (id: number, over: Row = {}): Row => ({
  id,
  booking_status: "awaiting_partner",
  booking_paid_at: iso(NOW - 10 * 60 * MIN),
  confirm_deadline_at: iso(NOW + 60 * MIN),
  confirm_reminded_at: null,
  cancelled_at: null,
  refund_id: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.spyOn(console, "error").mockImplementation(() => {});
  rows = [];
  limits = [];
  releaseBooking.mockResolvedValue("refunded");
  resumeClaimedRefund.mockResolvedValue("refunded");
  remindPartner.mockResolvedValue("reminded");
  reconcilePendingDeposit.mockResolvedValue({ state: "unchanged" });
  fakeDb();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/car-deposit-deadline", () => {
  it("sans secret de cron : refus, rien lu", async () => {
    const res = await GET(req());
    expect(res.status).toBeGreaterThanOrEqual(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("demande échue : libérée pour partner_timeout", async () => {
    rows = [awaiting(1, { confirm_deadline_at: iso(NOW - MIN) })];
    const body = await (await GET(req("s3cret"))).json();
    expect(releaseBooking).toHaveBeenCalledWith(1, "partner_timeout", NOW);
    expect(body).toEqual({ ok: true, released: 1, reminded: 0, resumed: 0, reconciled: 0, failed: 0 });
  });

  it("mi-délai passé : un rappel ; déjà rappelée : aucun", async () => {
    rows = [
      awaiting(1, { booking_paid_at: iso(NOW - 6 * 60 * MIN), confirm_deadline_at: iso(NOW + 60 * MIN) }),
      awaiting(2, { confirm_reminded_at: iso(NOW - 30 * MIN) }),
    ];
    const body = await (await GET(req("s3cret"))).json();
    expect(remindPartner).toHaveBeenCalledTimes(1);
    expect(remindPartner).toHaveBeenCalledWith(1, NOW);
    expect(body.reminded).toBe(1);
  });

  it("avant le mi-délai : pas de rappel", async () => {
    rows = [awaiting(1, { booking_paid_at: iso(NOW - MIN), confirm_deadline_at: iso(NOW + 600 * MIN) })];
    await GET(req("s3cret"));
    expect(remindPartner).not.toHaveBeenCalled();
  });

  const pending = (id: number, session: string | null): Row => ({
    id, booking_status: "pending_payment", booking_session_id: session, booking_paid_at: null, confirm_deadline_at: null,
    confirm_reminded_at: null, cancelled_at: iso(NOW - 120 * MIN), refund_id: null,
  });

  it("pending_payment avec session : rapprochée avec Stripe (webhook perdu), comptée en reconciled", async () => {
    rows = [pending(3, "cs_3"), pending(4, "cs_4")];
    reconcilePendingDeposit.mockResolvedValueOnce({ state: "paid" }).mockResolvedValueOnce({ state: "released" });
    const body = await (await GET(req("s3cret"))).json();
    expect(reconcilePendingDeposit).toHaveBeenCalledWith(3, "cs_3", NOW);
    expect(reconcilePendingDeposit).toHaveBeenCalledWith(4, "cs_4", NOW);
    expect(releaseBooking).not.toHaveBeenCalled();
    expect(body).toMatchObject({ reconciled: 2, failed: 0 });
  });

  it("session encore ouverte ou trop jeune : rien, non comptée", async () => {
    rows = [pending(3, "cs_3"), pending(4, "cs_4")];
    reconcilePendingDeposit.mockResolvedValueOnce({ state: "open", url: "https://checkout/x" }).mockResolvedValueOnce({ state: "unchanged" });
    const body = await (await GET(req("s3cret"))).json();
    expect(body).toMatchObject({ reconciled: 0, failed: 0 });
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("Stripe illisible : compté en failed, rien d'autre", async () => {
    rows = [pending(3, "cs_3")];
    reconcilePendingDeposit.mockResolvedValue({ state: "unreadable" });
    const body = await (await GET(req("s3cret"))).json();
    expect(body).toMatchObject({ reconciled: 0, failed: 1 });
    expect(notifyOps).not.toHaveBeenCalled();
  });

  it("rapprochement qui lève (base) : compté, ops prévenu, la ligne suivante passe", async () => {
    rows = [pending(3, "cs_3"), pending(4, "cs_4")];
    reconcilePendingDeposit.mockRejectedValueOnce(new Error("base down")).mockResolvedValueOnce({ state: "released" });
    const body = await (await GET(req("s3cret"))).json();
    expect(body).toMatchObject({ reconciled: 1, failed: 1 });
    expect(notifyOps).toHaveBeenCalledTimes(1);
  });

  it("verrou sans session : pas touché (aucun horodatage du verrou en base, voir le rapport F1)", async () => {
    rows = [pending(3, null)];
    const body = await (await GET(req("s3cret"))).json();
    expect(reconcilePendingDeposit).not.toHaveBeenCalled();
    expect(releaseBooking).not.toHaveBeenCalled();
    expect(remindPartner).not.toHaveBeenCalled();
    expect(resumeClaimedRefund).not.toHaveBeenCalled();
    expect(body).toMatchObject({ released: 0, reminded: 0, resumed: 0, reconciled: 0, failed: 0 });
  });

  it("reste d'un crash : repris au-delà de 15 min, pas avant", async () => {
    const stuck = (id: number, age: number): Row => ({
      ...awaiting(id), booking_status: "refunded", cancelled_at: iso(NOW - age * MIN),
    });
    rows = [stuck(4, 20), stuck(5, 5)];
    const body = await (await GET(req("s3cret"))).json();
    expect(resumeClaimedRefund).toHaveBeenCalledTimes(1);
    expect(resumeClaimedRefund).toHaveBeenCalledWith(4, NOW);
    expect(body.resumed).toBe(1);
  });

  it("refund_failed compté en failed, pas en released", async () => {
    rows = [awaiting(1, { confirm_deadline_at: iso(NOW - MIN) })];
    releaseBooking.mockResolvedValue("refund_failed");
    const body = await (await GET(req("s3cret"))).json();
    expect(body).toMatchObject({ released: 0, failed: 1 });
  });

  it("une ligne qui lève n'arrête pas la suivante, ops prévenu une fois", async () => {
    rows = [
      awaiting(1, { confirm_deadline_at: iso(NOW - 2 * MIN) }),
      awaiting(2, { confirm_deadline_at: iso(NOW - MIN) }),
    ];
    releaseBooking.mockRejectedValueOnce(new Error("base down")).mockResolvedValueOnce("refunded");
    const body = await (await GET(req("s3cret"))).json();
    expect(releaseBooking).toHaveBeenCalledTimes(2);
    expect(body).toMatchObject({ released: 1, failed: 1 });
    expect(notifyOps).toHaveBeenCalledTimes(1);
  });

  it("prise de main du rappel perdue : non compté", async () => {
    rows = [awaiting(1, { booking_paid_at: iso(NOW - 6 * 60 * MIN) })];
    remindPartner.mockResolvedValue("not_claimed");
    const body = await (await GET(req("s3cret"))).json();
    expect(body.reminded).toBe(0);
  });

  it("au plus 50 lignes par catégorie", async () => {
    await GET(req("s3cret"));
    expect(limits).toEqual([50, 50, 50, 50]);
  });
});
