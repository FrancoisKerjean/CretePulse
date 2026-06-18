import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { RegisterData } from "@/lib/affiliate";

export async function slugExists(slug: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("slug", slug).limit(1);
  return !!data && data.length > 0;
}

export async function codeExists(code: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("code_promo", code).limit(1);
  return !!data && data.length > 0;
}

export async function emailExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("affiliates").select("id").eq("email", email).limit(1);
  return !!data && data.length > 0;
}

export interface NewAffiliate extends RegisterData {
  slug: string;
  code_promo: string;
  commission_pct: number;
}

export async function insertAffiliate(row: NewAffiliate): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("affiliates")
    .insert({ ...row, status: "active" })
    .select("id")
    .single();
  if (error) {
    console.error("[affiliate-store] insert error:", error.message);
    return null;
  }
  return data as { id: string };
}

export async function findActiveBySlug(
  slug: string,
): Promise<{ id: string; redirect_url: string } | null> {
  const { data } = await supabase
    .from("affiliates")
    .select("id, redirect_url")
    .eq("slug", slug)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return (data as { id: string; redirect_url: string } | null) ?? null;
}

export async function insertClick(click: {
  affiliate_id: string;
  referer: string | null;
  ua: string | null;
  ip_hash: string | null;
}): Promise<void> {
  const { error } = await supabase.from("affiliate_clicks").insert(click);
  if (error) console.error("[affiliate-store] click insert error:", error.message);
}
