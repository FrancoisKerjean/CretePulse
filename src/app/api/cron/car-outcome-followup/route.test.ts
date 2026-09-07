// Route mince : authentification fail-closed, deux passes, compteurs en JSON.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Les deux mocks portent le type de retour RÉEL des passes : un compteur ajouté
// ou retiré côté module casse la compilation de ce test au lieu de le laisser
// vérifier un contrat JSON périmé. `import type` est effacé, il ne réintroduit
// aucun import runtime des modules mockés.
import type { OutcomeFollowupResult } from "@/lib/car-outcome-followup-server";
import type { InvoiceReminderResult } from "@/lib/car-invoice-reminder";

const { runOutcomeFollowupPass, runInvoiceReminderPass } = vi.hoisted(() => ({
  runOutcomeFollowupPass: vi.fn(
    async (): Promise<OutcomeFollowupResult> => ({
      sent: 2,
      refused: 0,
      escalated: 1,
      reminded: 0,
      withoutEmail: 0,
      partnerNotFound: 0,
      writeRefused: 0,
    }),
  ),
  runInvoiceReminderPass: vi.fn(async (): Promise<InvoiceReminderResult> => ({ reminded: 1, overdue: 0 })),
}));
vi.mock("@/lib/car-outcome-followup-server", () => ({ runOutcomeFollowupPass }));
vi.mock("@/lib/car-invoice-reminder", () => ({ runInvoiceReminderPass }));

import { GET } from "./route";

const req = (auth?: string) =>
  new Request("https://x/api/cron/car-outcome-followup", { headers: auth ? { authorization: auth } : {} }) as never;

describe("GET /api/cron/car-outcome-followup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("503 sans CRON_SECRET : fail-closed, aucune passe", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer undefined"));
    expect(res.status).toBe(503);
    expect(runOutcomeFollowupPass).not.toHaveBeenCalled();
  });

  it("403 sur un mauvais secret, aucune passe", async () => {
    const res = await GET(req("Bearer mauvais"));
    expect(res.status).toBe(403);
    expect(runOutcomeFollowupPass).not.toHaveBeenCalled();
    expect(runInvoiceReminderPass).not.toHaveBeenCalled();
  });

  it("appelle les deux passes avec le même instant et rend les compteurs", async () => {
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      outcome: {
        sent: 2,
        refused: 0,
        escalated: 1,
        reminded: 0,
        withoutEmail: 0,
        partnerNotFound: 0,
        writeRefused: 0,
      },
      invoices: { reminded: 1, overdue: 0 },
    });
    expect(runOutcomeFollowupPass).toHaveBeenCalledTimes(1);
    expect(runInvoiceReminderPass).toHaveBeenCalledTimes(1);
    const a = runOutcomeFollowupPass.mock.calls[0][0] as Date;
    const b = runInvoiceReminderPass.mock.calls[0][0] as Date;
    expect(a).toBeInstanceOf(Date);
    expect(a.getTime()).toBe(b.getTime());
  });
});
