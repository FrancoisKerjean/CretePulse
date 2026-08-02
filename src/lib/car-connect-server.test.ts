import { describe, it, expect, vi, beforeEach } from "vitest";

const accountsCreate = vi.fn(async () => ({ id: "acct_new" }));
const accountLinksCreate = vi.fn(async () => ({ url: "https://connect.stripe.com/setup/x" }));
const accountsRetrieve = vi.fn(async () => ({
  id: "acct_z", charges_enabled: true, payouts_enabled: true, details_submitted: true,
}));
vi.mock("./stays/stripe-helpers", () => ({
  stripeClient: () => ({
    accounts: { create: accountsCreate, retrieve: accountsRetrieve },
    accountLinks: { create: accountLinksCreate },
  }),
}));
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("./supabase-admin", () => ({ supabaseAdmin: { from } }));

import { startPartnerOnboarding, refreshPartnerKyc } from "./car-connect-server";

const PARTNER = { id: 111, name: "Zorbas Rent a Car", email: "info@zorbas.gr", stripe_connect_account_id: null, kyc_status: "none" };

function wiring(partner: unknown = PARTNER) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: partner }) }) }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("startPartnerOnboarding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cree le compte Express du loueur et rend son lien d onboarding", async () => {
    const updates = wiring();
    const res = await startPartnerOnboarding(111);

    expect(res).toMatchObject({ status: "ready", url: "https://connect.stripe.com/setup/x" });
    // Loueur cretois : compte grec, entreprise. Les deux capacites sont
    // demandees, sans quoi le transfert echouerait au moment du versement.
    expect(accountsCreate.mock.calls[0][0]).toMatchObject({
      type: "express",
      country: "GR",
      email: "info@zorbas.gr",
      business_type: "company",
    });
    expect(updates[0]).toMatchObject({ stripe_connect_account_id: "acct_new", kyc_status: "pending" });
  });

  it("reutilise le compte existant au lieu d en creer un second", async () => {
    wiring({ ...PARTNER, stripe_connect_account_id: "acct_z", kyc_status: "pending" });
    const res = await startPartnerOnboarding(111);

    expect(res.status).toBe("ready");
    expect(accountsCreate).not.toHaveBeenCalled();
    expect(accountLinksCreate.mock.calls[0][0]).toMatchObject({ account: "acct_z" });
  });

  it("dit lisiblement que la plateforme Connect n est pas ouverte", async () => {
    wiring();
    accountsCreate.mockRejectedValueOnce(
      new Error("You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.") as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await startPartnerOnboarding(111);

    expect(res).toMatchObject({ status: "failed", code: "payouts_unavailable" });
    // Aucun compte fantome ecrit sur le loueur.
    expect(JSON.stringify(errSpy.mock.calls)).toContain("payouts_unavailable");
    errSpy.mockRestore();
  });

  it("404 sur un loueur inconnu", async () => {
    wiring(null);
    expect((await startPartnerOnboarding(999)).status).toBe("not_found");
    expect(accountsCreate).not.toHaveBeenCalled();
  });

  it("refuse d onboarder un loueur sans email", async () => {
    wiring({ ...PARTNER, email: null });
    expect((await startPartnerOnboarding(111)).status).toBe("not_found");
    expect(accountsCreate).not.toHaveBeenCalled();
  });
});

describe("refreshPartnerKyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passe complete quand Stripe accepte les versements", async () => {
    const updates = wiring({ ...PARTNER, stripe_connect_account_id: "acct_z", kyc_status: "pending" });
    expect(await refreshPartnerKyc(111)).toBe("complete");
    expect(updates[0]).toMatchObject({ kyc_status: "complete" });
  });

  it("reste pending tant que les versements ne sont pas ouverts", async () => {
    // payouts_enabled est le seul signal qui compte : un compte peut encaisser
    // sans pouvoir etre paye, et c'est le versement qui nous interesse.
    accountsRetrieve.mockResolvedValueOnce({
      id: "acct_z", charges_enabled: true, payouts_enabled: false, details_submitted: true,
    } as never);
    const updates = wiring({ ...PARTNER, stripe_connect_account_id: "acct_z", kyc_status: "pending" });
    expect(await refreshPartnerKyc(111)).toBe("pending");
    expect(updates[0]).toMatchObject({ kyc_status: "pending" });
  });

  it("ne demande rien a Stripe pour un loueur sans compte", async () => {
    wiring();
    expect(await refreshPartnerKyc(111)).toBe("none");
    expect(accountsRetrieve).not.toHaveBeenCalled();
  });
});
