import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StayListing, StayOwner, StayRequest } from "./types";

export function slugify(input: string, suffix?: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return suffix ? `${base}-${suffix}` : base;
}

export async function upsertOwnerByEmail(
  email: string,
  name: string | null,
  phone: string | null,
): Promise<StayOwner> {
  const { data: existing } = await supabaseAdmin
    .from("stay_owners")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (existing) return existing as StayOwner;
  const { data, error } = await supabaseAdmin
    .from("stay_owners")
    .insert({ email, name, phone })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayOwner;
}

export async function createDraftListing(
  input: Partial<StayListing> & { owner_id: number; slug: string },
): Promise<StayListing> {
  const { data, error } = await supabaseAdmin
    .from("stay_listings")
    .insert({ ...input, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayListing;
}

export async function getListingBySlug(slug: string): Promise<StayListing | null> {
  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as StayListing) ?? null;
}

export async function getListingById(id: number): Promise<StayListing | null> {
  const { data } = await supabaseAdmin
    .from("stay_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as StayListing) ?? null;
}

export async function publishListing(
  id: number,
  icalUrl: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("stay_listings")
    .update({ status: "published", ical_private_url: icalUrl })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createStayRequest(
  row: Record<string, unknown>,
): Promise<StayRequest> {
  const { data, error } = await supabaseAdmin
    .from("stay_requests")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StayRequest;
}

export async function getRequestByApproveHash(
  hash: string,
): Promise<StayRequest | null> {
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("*")
    .eq("approve_token_hash", hash)
    .maybeSingle();
  return (data as StayRequest) ?? null;
}

export async function getRequestByPayHash(
  hash: string,
): Promise<StayRequest | null> {
  const { data } = await supabaseAdmin
    .from("stay_requests")
    .select("*")
    .eq("pay_token_hash", hash)
    .maybeSingle();
  return (data as StayRequest) ?? null;
}

export async function recentDuplicateExists(
  guestEmail: string,
  listingId: number,
  dateFrom: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("stay_requests")
    .select("id", { count: "exact", head: true })
    .eq("guest_email", guestEmail)
    .eq("listing_id", listingId)
    .eq("date_from", dateFrom)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

export async function ipRateLimited(ipHashVal: string): Promise<boolean> {
  const countSince = async (ms: number): Promise<number> => {
    const since = new Date(Date.now() - ms).toISOString();
    const { count } = await supabaseAdmin
      .from("stay_requests")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHashVal)
      .gte("created_at", since);
    return count ?? 0;
  };
  if ((await countSince(60 * 60 * 1000)) >= 4) return true;
  if ((await countSince(24 * 60 * 60 * 1000)) >= 12) return true;
  return false;
}
