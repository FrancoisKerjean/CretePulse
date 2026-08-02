/**
 * Politique de blocage des crawlers commerciaux.
 *
 * Mesure du 01/08/2026 sur le cycle de facturation Vercel en cours (11 jours) :
 * 2,82 M d'edge requests pour 1 370 events Web Analytics, soit 99,95 % de trafic
 * non humain. Ces requêtes déclenchent des écritures ISR (2,06 M, poste de coût
 * n°1 à 8,27 $), des invocations de fonctions et du transfert facturé.
 *
 * Les agents listés ici sont des outils SEO revendus en abonnement et des
 * aspirateurs de données. Aucun n'envoie de visiteur, aucun n'apporte de
 * visibilité : on paie pour alimenter le produit de quelqu'un d'autre.
 *
 * Ce qui n'est PAS bloqué, volontairement :
 *  - Googlebot, bingbot, DuckDuckBot, YandexBot, Applebot : ils apportent le
 *    trafic de recherche, seule raison d'être des 24 000 pages du site.
 *  - GPTBot, ClaudeBot, PerplexityBot et consorts : la visibilité dans les
 *    réponses des LLM est un canal assumé (décision Kami du 01/08/2026), et
 *    src/app/robots.ts les autorise explicitement.
 *  - La Chine est déjà coupée en amont, par géographie, dans src/middleware.ts.
 *
 * Les jetons sont comparés en sous-chaîne sur le user-agent en minuscules :
 * les éditeurs versionnent (`AhrefsBot/7.0`) et déclinent (`SemrushBot-BA`)
 * leurs agents en permanence, un match exact serait périmé sous un mois.
 */
export const BLOCKED_CRAWLERS = [
  // Backlink et audit SEO vendus en SaaS
  "ahrefsbot",
  "semrushbot",
  "dataforseobot",
  "mj12bot", // Majestic
  "dotbot", // Moz
  "rogerbot", // Moz
  "blexbot", // WebMeUp
  "serpstatbot",
  "barkrowler", // Babbar
  "seokicks",
  "screaming frog",
  // Revente de données de contact et d'entreprise
  "zoominfobot",
  // Aspirateurs à fort volume, sans canal de retour
  "bytespider", // ByteDance
  "petalbot", // Huawei
  "amazonbot",
] as const satisfies readonly string[];

/**
 * Les mêmes agents, sous le nom exact que leur éditeur documente pour robots.txt.
 *
 * Séparé de BLOCKED_CRAWLERS parce qu'un jeton de user-agent (`mj12bot`) et un
 * nom d'agent robots.txt (`MJ12bot`) ne suivent pas les mêmes règles. Les trois
 * tests d'alignement de crawler-policy.test.ts interdisent aux deux listes de
 * diverger : on ne bloque jamais en silence, on ne demande jamais poliment ce
 * qu'on n'applique pas.
 *
 * Utilité réelle malgré le middleware : les outils SEO en abonnement respectent
 * robots.txt, et un agent qui renonce avant de requêter ne coûte même pas
 * l'edge request du 403.
 */
export const ROBOTS_TXT_AGENTS = [
  "AhrefsBot",
  "SemrushBot",
  "DataForSeoBot",
  "MJ12bot",
  "DotBot",
  "rogerbot",
  "BLEXBot",
  "serpstatbot",
  "Barkrowler",
  "SEOkicks",
  "Screaming Frog SEO Spider",
  "ZoominfoBot",
  "Bytespider",
  "PetalBot",
  "Amazonbot",
] as const satisfies readonly string[];

/**
 * Vrai si le user-agent appartient à un crawler commercial bloqué.
 *
 * Un user-agent absent ou vide passe : c'est le cas des sondes internes et de
 * certains clients légitimes, et se tromper de sens ici coûterait des visiteurs
 * réels. Le doute profite toujours à la requête.
 */
export function isBlockedCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BLOCKED_CRAWLERS.some((token) => ua.includes(token));
}
