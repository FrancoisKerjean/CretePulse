// Token helpers for the Stays flow (approve / pay links). Node-safe (crypto),
// usable from server routes. We store the SHA256 in the DB, never the plaintext
// token; the plaintext only lives in the URL sent by email.
// Self-contained on the stays branch (mirrors the car-rental car-quote helpers).
import { createHash, randomUUID } from "crypto";

export const newToken = (): string => randomUUID();

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const siteBase = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
