"use server";
// Écritures du back-office. Chaque action revalide le cookie (guard) puis
// valide via la logique pure avant l'update. Erreur → throw : Next affiche
// l'erreur, les données restent intactes.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isActivityAdmin } from "@/lib/activity-admin-auth";
import { OUTCOMES, commissionEur, validatePartnerUpdate, CITY_SLUGS } from "@/lib/activity-admin";

const PATH = "/admin/activities";

async function guard() {
  if (!(await isActivityAdmin())) throw new Error("Forbidden");
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Issue d'une demande : bouton rented (avec montant) ou lost. */
export async function setOutcome(id: number, formData: FormData) {
  await guard();
  const outcome = String(formData.get("outcome") ?? "");
  if (!(OUTCOMES as readonly string[]).includes(outcome)) throw new Error("Invalid outcome");
  const finalAmount = outcome === "rented" ? num(formData.get("amount")) : null;
  if (outcome === "rented" && finalAmount == null) {
    redirect(`${PATH}?error=${encodeURIComponent("Montant requis pour marquer une activité réalisée")}`);
  }

  let commission: number | null = null;
  if (outcome === "rented" && finalAmount != null) {
    const { data: req } = await supabase.from("activity_requests")
      .select("quoted_by_partner_id").eq("id", id).maybeSingle();
    if (req?.quoted_by_partner_id != null) {
      const { data: p } = await supabase.from("activity_partners")
        .select("commission").eq("id", req.quoted_by_partner_id).maybeSingle();
      if (p) commission = commissionEur(finalAmount, p.commission);
    }
  }

  const { error } = await supabase.from("activity_requests").update({
    outcome,
    outcome_at: new Date().toISOString(),
    final_amount_eur: finalAmount,
    commission_eur: commission,
    ...(outcome === "lost" ? { commission_paid_at: null } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Bascule commission encaissée / due. */
export async function setCommissionPaid(id: number, paid: boolean) {
  await guard();
  const { error } = await supabase.from("activity_requests")
    .update({ commission_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", id).eq("outcome", "rented");
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function saveNote(id: number, formData: FormData) {
  await guard();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const { error } = await supabase.from("activity_requests").update({ admin_note: note }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function togglePartnerActive(id: number, active: boolean) {
  await guard();
  const { error } = await supabase.from("activity_partners").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Categorie + villes + taux de commission d'un partenaire. */
export async function updatePartner(id: number, formData: FormData) {
  await guard();
  const category_slug = String(formData.get("category_slug") ?? "");
  const cities = CITY_SLUGS.filter((c) => formData.get(`city-${c}`) === "on");
  const pct = num(formData.get("commissionPct"));
  const commission = pct == null ? NaN : Math.round(pct * 100) / 10000;
  const err = validatePartnerUpdate({ category_slug, cities, commission });
  if (err) redirect(`${PATH}?tab=partners&error=${encodeURIComponent(err)}`);
  const { error } = await supabase.from("activity_partners").update({ category_slug, cities, commission }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}
