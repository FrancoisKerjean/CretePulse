export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain] = email.trim().toLowerCase().split("@");
  if (!rawLocal || !rawDomain) return email.trim().toLowerCase();
  let local = rawLocal;
  if (rawDomain === "gmail.com" || rawDomain === "googlemail.com") {
    const plusIdx = local.indexOf("+");
    if (plusIdx >= 0) local = local.slice(0, plusIdx);
    local = local.replace(/\./g, "");
  }
  return `${local}@${rawDomain}`;
}

export function sanitizeText(input: string): string {
  // Politique : ZÉRO HTML autorisé (équivalent DOMPurify ALLOWED_TAGS:[]).
  // Implémentation pure (pas de DOMPurify/jsdom) : jsdom déclenche
  // ERR_REQUIRE_ESM au runtime serverless sous Turbopack (incident 16/06,
  // /api/reviews/submit en 500). React échappe déjà tout à l'affichage =
  // défense en profondeur conservée.
  return input
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "") // élément + contenu
    .replace(/<[^>]*>/g, "")                                    // balises restantes
    .replace(/[<>]/g, "")                                       // chevrons orphelins
    .trim();
}

export function sanitizeAuthorName(name: string): string {
  // Strip newlines + any HTML, then keep only Unicode L/N/P/Z (separators) + space.
  const stripped = sanitizeText(name).replace(/[\r\n]/g, "");
  const allowed = stripped.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "");
  return allowed.slice(0, 40);
}
