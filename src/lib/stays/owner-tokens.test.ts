import { describe, it, expect, vi, beforeEach } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../supabase-admin", () => ({ supabaseAdmin: { from } }));

import { ensureOwnerToken, ownerSpaceUrl } from "./owner-tokens";
import { hashToken } from "./tokens";

function wiring(owner: unknown) {
  const updates: Array<Record<string, unknown>> = [];
  from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: owner }) }) }),
    update: (patch: Record<string, unknown>) => {
      updates.push(patch);
      return { eq: async () => ({ error: null }) };
    },
  }));
  return updates;
}

describe("ensureOwnerToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cree un jeton au premier appel et n en stocke que le hash", async () => {
    const updates = wiring({ id: 1, owner_token_hash: null });
    const token = await ensureOwnerToken(1);

    expect(token).toBeTruthy();
    expect(updates[0].owner_token_hash).toBe(hashToken(token as string));
    // Le clair ne doit exister que dans l URL envoyee par email.
    expect(JSON.stringify(updates)).not.toContain(token);
  });

  it("ne regenere pas un jeton existant : le lien deja envoye doit survivre", async () => {
    // Un proprietaire garde son lien dans sa boite mail pendant des mois.
    const updates = wiring({ id: 1, owner_token_hash: "deja-pose" });
    expect(await ensureOwnerToken(1)).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it("rend null sur un proprietaire inconnu, sans rien ecrire", async () => {
    const updates = wiring(null);
    expect(await ensureOwnerToken(999)).toBeNull();
    expect(updates).toHaveLength(0);
  });
});

describe("ownerSpaceUrl", () => {
  it("pointe vers l espace, dans la langue du proprietaire", () => {
    expect(ownerSpaceUrl("tok", "fr")).toBe("https://crete.direct/fr/stays/owner/tok");
  });

  it("retombe sur l anglais sans locale", () => {
    expect(ownerSpaceUrl("tok")).toBe("https://crete.direct/en/stays/owner/tok");
  });
});
