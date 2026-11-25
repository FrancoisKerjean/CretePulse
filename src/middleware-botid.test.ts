// Les chemins du défi BotID doivent échapper au middleware next-intl, sinon il
// les préfixe en /en/… et le défi ne charge plus : chaque inscription newsletter
// passerait pour un robot. Le préfixe est fixé par le paquet `botid` ; s'il change
// à une mise à jour, ce test casse avant la prod.
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({ default: () => () => undefined }));

import { withBotId } from "botid/next/config";
import { config } from "./middleware";

describe("middleware × BotID", () => {
  it("le matcher exclut le préfixe des chemins BotID", async () => {
    const rewrites = await withBotId({}).rewrites!();
    const list = Array.isArray(rewrites) ? rewrites : [...rewrites.beforeFiles, ...rewrites.afterFiles];
    const prefixes = new Set(list.map((r) => r.source.split("/")[1]));
    expect(prefixes.size).toBeGreaterThan(0);
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    for (const p of prefixes) {
      expect(pattern.test(`/${p}/2d206a39-8ed7-437e-a3be-862e0f06eea3/abc`)).toBe(false);
    }
    expect(pattern.test("/en/beaches")).toBe(true);
  });
});
