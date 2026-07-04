import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { CAR_ZONES } from "@/lib/car-partners";
import type { RegisterData } from "@/lib/affiliate";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Crete Direct <hello@crete.direct>";
const ALL_ZONE_IDS = CAR_ZONES.map((z) => z.id);

/** Un email déjà présent dans le registre des loueurs (contrainte unique). */
export async function carPartnerEmailExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("car_partners").select("id").eq("email", email).limit(1);
  return !!data && data.length > 0;
}

/** Loueur inbound (inscrit lui-même via /affiliate) : accord acquis, actif
 *  d'emblée, toutes zones (la plupart livrent partout). outreach_status
 *  'inbound' l'exclut de la machine de recrutement à froid (qui cible 'new'). */
export async function insertCarRentalPartner(data: RegisterData): Promise<{ id: number } | null> {
  const { data: row, error } = await supabase.from("car_partners").insert({
    name: data.name,
    email: data.email,
    zone_ids: ALL_ZONE_IDS,
    commission: 0.10,
    lead_routing: "direct",
    active: true,
    outreach_status: "inbound",
  }).select("id").single();
  if (error) {
    console.error("[car-rental-signup] insert error:", error.message);
    return null;
  }
  return row as { id: number };
}

/** Email de bienvenue Car Rental Direct (onboarding, aucune donnée client). */
export async function sendCarRentalDirectWelcome(name: string, email: string): Promise<void> {
  const first = name.split(" ")[0] || name;
  const text = `Hi ${first},

Thanks for joining crete.direct. You're now part of Car Rental Direct, and here's how you'll get real customers.

How it works - 4 steps:
1. A traveller requests a car on crete.direct (dates, pickup, car type).
2. We email you the request with a one-click link - no login.
3. You send your price. First to reply wins the lead.
4. The customer gets your quote instantly. If they accept, we connect you both directly.

The deal, in one line: 10% commission only on the rentals we bring you. No subscription, no fixed fee.

Location doesn't matter - we send you requests from all over Crete, you answer the ones you can serve.

You'll start receiving requests shortly. Any question, just reply to this email.

Kami - crete.direct
`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: "contact@kairosguest.com",
    subject: "Welcome to Car Rental Direct - how it works",
    text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
