import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client with service-role privileges.
// Used by API routes that must WRITE to tables the public anon role cannot
// (e.g. newsletter_subscribers, where anon lacks INSERT/UPDATE grants).
// NEVER import this from a client component — the key must stay server-side.
//
// Init paresseuse : SUPABASE_SERVICE_KEY n'existe que sur Vercel (pas en
// .env.local). Un createClient au chargement du module fait planter
// `next build` local a l'etape "collecting page data". Le client n'est
// instancie qu'au premier appel, c'est-a-dire au runtime d'une requete.
let client: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getAdmin()[prop as keyof SupabaseClient];
  },
});
