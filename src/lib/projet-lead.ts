// Validation pure du lead /projet (institution | sponsor). Zero I/O, node-safe.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProjetLeadKind = "institution" | "sponsor";
export type ProjetLead = {
  kind: ProjetLeadKind;
  locale: string;
  name: string;
  email: string;
  org: string | null;
  role: string | null;
  company: string | null;
  website: string | null;
  message: string | null;
};
export type ProjetLeadResult =
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string }
  | { kind: "ok"; lead: ProjetLead };

const str = (v: unknown, max = 500): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export function validateProjetLead(body: Record<string, unknown>): ProjetLeadResult {
  // honeypot (champ cache `hp`) rempli => bot, succes silencieux
  if (body.hp && String(body.hp).trim() !== "") return { kind: "honeypot" };

  const kind = body.kind;
  if (kind !== "institution" && kind !== "sponsor") return { kind: "error", status: 400, error: "Invalid kind" };

  const name = str(body.name, 120);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !EMAIL_REGEX.test(email)) return { kind: "error", status: 422, error: "Invalid request" };

  const org = str(body.org, 160);
  const company = str(body.company, 160);
  if (kind === "institution" && !org) return { kind: "error", status: 422, error: "Organisation required" };
  if (kind === "sponsor" && !company) return { kind: "error", status: 422, error: "Company required" };

  return {
    kind: "ok",
    lead: {
      kind, name, email,
      locale: typeof body.locale === "string" ? body.locale : "en",
      org, role: str(body.role, 120), company,
      website: str(body.website, 200), message: str(body.message, 1500),
    },
  };
}
