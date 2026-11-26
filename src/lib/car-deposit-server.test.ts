import { describe, it, expect, vi, beforeEach } from "vitest";
import { athensWallToUtcMs } from "./car-deposit";
import type { QuoteOption } from "./car-quotes";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));
vi.mock("./car-quote", async (orig: () => Promise<Record<string, unknown>>) => ({
  ...(await orig()),
  newToken: () => "book-plain",
  // Hash opaque : un mock qui recopierait le jeton rendrait impossible
  // l'assertion « le clair ne va jamais en base ».
  hashToken: () => "deadbeefhash",
  siteBase: () => "https://crete.direct",
}));

import { startDeposit, depositRatesFor, onDepositSessionExpired } from "./car-deposit-server";

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
