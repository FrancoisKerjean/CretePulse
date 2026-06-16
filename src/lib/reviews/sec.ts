import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "../supabase-admin";

const CURRENT_SALT_VERSION = 1;

export function hashIp(ip: string): string {
  const salt = process.env.REVIEWS_SALT ?? "";
  return createHash("sha256").update(ip + salt).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export const SALT_VERSION = CURRENT_SALT_VERSION;

export async function rateLimit(opts: {
  table: "cb_reviews" | "cb_review_votes" | "cb_review_reports";
  filter: { column: string; value: string };
  limit: number;
  windowSec: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString();
  const { count, error } = await supabase
    .from(opts.table)
    .select("*", { count: "exact", head: true })
    .eq(opts.filter.column, opts.filter.value)
    .gte("created_at", since);
  if (error) return false; // fail-open: don't block legitimate users on transient DB error
  return (count ?? 0) >= opts.limit;
}

export async function fakeAwaitEmail(): Promise<void> {
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
}
