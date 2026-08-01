import { describe, expect, it } from "vitest";
import { BLOCKED_CRAWLERS, ROBOTS_TXT_AGENTS, isBlockedCrawler } from "./crawler-policy";

describe("isBlockedCrawler", () => {
  // Les crawlers commerciaux visés : outils SEO revendus en abonnement et
  // aspirateurs de données. Aucun n'envoie de visiteur, tous coûtent des
  // écritures ISR et des invocations facturées.
  const blocked = [
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
    "Mozilla/5.0 (compatible; DataForSeoBot/1.0; +https://dataforseo.com/dataforseo-bot)",
    "Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)",
    "Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)",
    "rogerbot/1.0 (http://moz.com/help/pro/what-is-rogerbot-)",
    "Mozilla/5.0 (compatible; BLEXBot/1.0; +http://webmeup-crawler.com/)",
    "Mozilla/5.0 (compatible; serpstatbot/2.1; +http://serpstatbot.com/)",
    "Barkrowler/0.9 (+https://babbar.tech/crawler)",
    "Mozilla/5.0 (compatible; SEOkicks; +https://www.seokicks.de/robot.html)",
    "Mozilla/5.0 (compatible; ZoominfoBot; zoominfobot at zoominfo dot com)",
    "Screaming Frog SEO Spider/19.0",
    "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
    "Mozilla/5.0 (compatible; PetalBot; +https://webmaster.petalsearch.com/site/petalbot)",
    "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
  ];

  for (const ua of blocked) {
    it(`bloque ${ua.slice(0, 45)}`, () => {
      expect(isBlockedCrawler(ua)).toBe(true);
    });
  }

  // Ces agents rapportent des visiteurs ou de la visibilité. Les bloquer par
  // accident coûterait infiniment plus cher que les requêtes économisées : ce
  // sont eux qui doivent casser la CI si la liste dérape.
  const allowed = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-InspectionTool/1.0)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; DuckDuckBot/1.1; https://duckduckgo.com/duckduckbot)",
    "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Applebot/0.1",
    // Bots IA : décision Kami du 01/08/2026, la visibilité dans les réponses
    // des LLM est un canal assumé, le robots.txt les autorise explicitement.
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    // Vrais navigateurs, y compris ceux qui contiennent "bot" dans un mot.
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  ];

  for (const ua of allowed) {
    it(`laisse passer ${ua.slice(0, 45)}`, () => {
      expect(isBlockedCrawler(ua)).toBe(false);
    });
  }

  it("laisse passer un user-agent absent plutôt que de bloquer au hasard", () => {
    expect(isBlockedCrawler(null)).toBe(false);
    expect(isBlockedCrawler("")).toBe(false);
  });

  it("est insensible à la casse", () => {
    expect(isBlockedCrawler("ahrefsbot/7.0")).toBe(true);
    expect(isBlockedCrawler("AHREFSBOT/7.0")).toBe(true);
  });

  it("expose une liste non vide, en minuscules, sans doublon", () => {
    expect(BLOCKED_CRAWLERS.length).toBeGreaterThan(0);
    for (const token of BLOCKED_CRAWLERS) {
      expect(token).toBe(token.toLowerCase());
    }
    expect(new Set(BLOCKED_CRAWLERS).size).toBe(BLOCKED_CRAWLERS.length);
  });

  // Garde-fou : un jeton trop court ou trop générique attraperait des
  // navigateurs. "bot" seul bloquerait Googlebot ET la moitié du web.
  it("ne contient aucun jeton trop générique", () => {
    for (const token of BLOCKED_CRAWLERS) {
      expect(token.length).toBeGreaterThanOrEqual(6);
      expect(["bot", "spider", "crawler", "mozilla"]).not.toContain(token);
    }
  });
});

// robots.txt et le middleware doivent viser exactement les mêmes agents. Si les
// deux listes divergent, un crawler est soit bloqué sans avoir été prévenu, soit
// prié de partir sans qu'on l'empêche d'entrer. La CI casse dans les deux cas.
describe("ROBOTS_TXT_AGENTS", () => {
  it("couvre exactement les agents bloqués par le middleware", () => {
    expect(ROBOTS_TXT_AGENTS.length).toBe(BLOCKED_CRAWLERS.length);
  });

  it("déclare des noms que le middleware bloquerait vraiment", () => {
    for (const agent of ROBOTS_TXT_AGENTS) {
      expect(isBlockedCrawler(agent), `${agent} déclaré dans robots.txt mais non bloqué`).toBe(true);
    }
  });

  it("laisse chaque jeton du middleware annoncé dans robots.txt", () => {
    for (const token of BLOCKED_CRAWLERS) {
      const declared = ROBOTS_TXT_AGENTS.some((agent) => agent.toLowerCase().includes(token));
      expect(declared, `${token} bloqué en silence, absent de robots.txt`).toBe(true);
    }
  });
});
