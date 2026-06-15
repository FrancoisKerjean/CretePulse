import DOMPurify from "isomorphic-dompurify";

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
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeAuthorName(name: string): string {
  // Strip newlines + any HTML, then keep only Unicode L/N/P/Z (separators) + space.
  const stripped = sanitizeText(name).replace(/[\r\n]/g, "");
  const allowed = stripped.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "");
  return allowed.slice(0, 40);
}
