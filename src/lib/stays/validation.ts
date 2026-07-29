import { createHash } from "node:crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidStayRequest {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  dateFrom: string;
  dateTo: string;
  pax: number | null;
  message: string | null;
}

export type StayRequestValidation =
  | { kind: "ok"; row: ValidStayRequest }
  | { kind: "honeypot" }
  | { kind: "error"; status: number; error: string };

export function validateStayRequest(
  body: Record<string, unknown>,
): StayRequestValidation {
  if (body.website && String(body.website).trim() !== "") {
    return { kind: "honeypot" };
  }
  const guestName = typeof body.guestName === "string" ? body.guestName.trim() : "";
  const guestEmail =
    typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase() : "";
  const dateFrom = String(body.dateFrom ?? "");
  const dateTo = String(body.dateTo ?? "");

  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!guestName || !EMAIL_REGEX.test(guestEmail) || !isDate(dateFrom) || !isDate(dateTo)) {
    return { kind: "error", status: 422, error: "Invalid request" };
  }
  if (new Date(dateTo + "T00:00:00Z").getTime() <= new Date(dateFrom + "T00:00:00Z").getTime()) {
    return { kind: "error", status: 422, error: "Invalid date range" };
  }
  const paxRaw = Number(body.pax);
  return {
    kind: "ok",
    row: {
      guestName,
      guestEmail,
      guestPhone: typeof body.guestPhone === "string" ? body.guestPhone.trim() : null,
      dateFrom,
      dateTo,
      pax: Number.isFinite(paxRaw) && paxRaw > 0 ? Math.floor(paxRaw) : null,
      message: typeof body.message === "string" ? body.message.slice(0, 2000) : null,
    },
  };
}

export function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.STAYS_RL_SALT || process.env.CAR_RL_SALT || "crete-direct-stays-rl";
  return createHash("sha256").update(ip + salt).digest("hex");
}
