import { describe, it, expect, vi, beforeEach } from "vitest";

const ensureCommissionCheckout = vi.fn();
vi.mock("@/lib/car-commission-server", () => ({ ensureCommissionCheckout }));

beforeEach(() => ensureCommissionCheckout.mockReset());

function post(token?: string) {
  const body = new URLSearchParams();
  if (token !== undefined) body.set("token", token);
  return new Request("https://x", { method: "POST", body }) as never;
}

describe("POST /api/car-rental/commission/checkout", () => {
  it("redirige vers Stripe quand la session est creee", async () => {
    ensureCommissionCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    const { POST } = await import("./route");
    const res = await POST(post("abc"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://checkout.stripe.com/x");
  });

  it("rend 404 sur un token inconnu, sans rien reveler", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "not_found" });
    const { POST } = await import("./route");
    const res = await POST(post("nope"));
    expect(res.status).toBe(404);
    // Le corps ne dit rien de plus que le code : pas de numero, pas de loueur.
    expect(JSON.stringify(await res.json())).not.toContain("NOVAI");
  });

  it("refuse de repayer une facture deja reglee", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "already_paid" });
    const { POST } = await import("./route");
    const res = await POST(post("abc"));
    expect(res.status).toBe(409);
  });

  it("refuse de payer une facture annulee par avoir", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "credited" });
    const { POST } = await import("./route");
    const res = await POST(post("abc"));
    expect(res.status).toBe(409);
  });

  // Un formulaire sans jeton ne doit jamais atteindre Stripe : sinon chaque POST
  // nu declencherait une lecture base pour rien.
  it("rend 400 et ne touche a rien quand le jeton manque", async () => {
    const { POST } = await import("./route");
    const res = await POST(post());
    expect(res.status).toBe(400);
    expect(ensureCommissionCheckout).not.toHaveBeenCalled();
  });

  it("rend 400 sur un jeton vide", async () => {
    const { POST } = await import("./route");
    const res = await POST(post(""));
    expect(res.status).toBe(400);
    expect(ensureCommissionCheckout).not.toHaveBeenCalled();
  });

  // Une panne Stripe n est ni la faute du loueur ni un 404 : 502, il peut reessayer.
  it("rend 502 sur une erreur Stripe inconnue", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "stripe_unavailable" });
    const { POST } = await import("./route");
    const res = await POST(post("abc"));
    expect(res.status).toBe(502);
  });

  it("rend 502 quand la session revient sans url", async () => {
    ensureCommissionCheckout.mockResolvedValue({ error: "session_without_url" });
    const { POST } = await import("./route");
    const res = await POST(post("abc"));
    expect(res.status).toBe(502);
  });

  it("passe le jeton du formulaire tel quel", async () => {
    ensureCommissionCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/y" });
    const { POST } = await import("./route");
    await POST(post("tok-42"));
    expect(ensureCommissionCheckout).toHaveBeenCalledWith("tok-42");
  });
});
