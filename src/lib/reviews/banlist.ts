// Lowercase, NFD-normalized banned words across FR/EN/DE/EL.
// Keep the list short and curated. LLM-level toxicity is V2.
const BANLIST: readonly string[] = [
  // FR
  "connard","connasse","salope","pute","enculé","encule","cretin","con",
  // EN
  "idiot","moron","retard","asshole","bitch","fuck","cunt","whore",
  // DE
  "arsch","arschloch","schlampe","fotze","wichser",
  // EL (transliterated)
  "malakas","malaka","gamoto","poutana",
  // spam patterns (kept as whole words too)
  "viagra","cialis","casino","crypto","onlyfans",
];

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase();
}

const BAN_REGEX = new RegExp(
  "\\b(" + BANLIST.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
);

export function containsBanned(text: string): boolean {
  if (!text) return false;
  return BAN_REGEX.test(norm(text));
}

export function looksLikeSpam(text: string): boolean {
  if (!text) return false;
  const urlCount = (text.match(/https?:\/\//gi) ?? []).length;
  if (urlCount >= 2) return true;
  const emailCount = (text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) ?? []).length;
  if (emailCount >= 1) return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const nonAlnum = (trimmed.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
  return nonAlnum / trimmed.length > 0.5;
}
