import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { ACTIVITY_CITIES } from "@/lib/activity-taxonomy";
import type { RegisterData } from "@/lib/affiliate";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Crete Direct <hello@crete.direct>";
const ALL_CITY_SLUGS = ACTIVITY_CITIES.map((c) => c.slug);

/** Un email déjà présent dans le registre des prestataires d'activités (contrainte unique). */
export async function activityPartnerEmailExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("activity_partners").select("id").eq("email", email).limit(1);
  return !!data && data.length > 0;
}

/** Prestataire inbound (inscrit lui-même via /affiliate) : accord acquis, actif
 *  d'emblée, toutes villes. outreach_status 'inbound' l'exclut de la machine
 *  de recrutement à froid (qui cible 'new'). */
export async function insertActivityPartner(data: RegisterData, categorySlug: string): Promise<{ id: number } | null> {
  const { data: row, error } = await supabase.from("activity_partners").insert({
    name: data.name,
    email: data.email,
    category_slug: categorySlug,
    cities: ALL_CITY_SLUGS,
    languages: ["en"],
    commission: 0.15,
    lead_routing: "direct",
    active: true,
    outreach_status: "inbound",
  }).select("id").single();
  if (error) {
    console.error("[activity-signup] insert error:", error.message);
    return null;
  }
  return row as { id: number };
}

/** Email de bienvenue Activities Direct (onboarding, aucune donnée client). */
export async function sendActivitiesDirectWelcome(name: string, email: string): Promise<void> {
  const first = name.split(" ")[0] || name;
  const text = `Hi ${first},

Thanks for joining crete.direct. You're now part of Activities Direct, and here's how you'll get real customers.

How it works - 4 steps:
1. A traveller requests an activity on crete.direct (category, city, date, group size).
2. We email you the request with a one-click link - no login.
3. You send your price for the whole group.
4. The customer compares quotes and picks one — if it's yours, we connect you both directly.

The deal, in one line: 15% commission only on the bookings we bring you. No subscription, no fixed fee.

You'll start receiving requests for your category and area shortly. Any question, just reply to this email.

Kami - crete.direct
`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: "contact@kairosguest.com",
    subject: "Welcome to Activities Direct - how it works",
    text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
