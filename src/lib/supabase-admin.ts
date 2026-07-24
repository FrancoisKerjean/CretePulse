import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client with service-role privileges.
// Used by API routes that must WRITE to tables the public anon role cannot
// (e.g. newsletter_subscribers, where anon lacks INSERT/UPDATE grants).
// NEVER import this from a client component · the key must stay server-side.
//
// Init paresseuse : SUPABASE_SERVICE_KEY n'existe que sur Vercel (pas en
// .env.local). Un createClient au chargement du module fait planter
// `next build` local a l'etape "collecting page data". Le client n'est
// instancie qu'au premier appel, c'est-a-dire au runtime d'une requete.
let client: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    // Build-safe : au prerender (`next build`), la clé service peut manquer sur
    // le scope Vercel (ex. Preview). createClient(url, undefined) lève
    // « supabaseKey is required » et casse tout le build. On instancie avec un
    // placeholder non vide : createClient ne lève plus, et les requêtes
    // échouent alors proprement (renvoyées dans `error`, catchées par les
    // consommateurs → valeur de repli) au lieu de planter le build. En runtime
    // prod la vraie clé est présente et tout fonctionne normalement.
    if (!url || !key) {
      console.warn(
        "[supabase-admin] URL ou clé service absente — client dégradé " +
          "(build-safe : requêtes en échec contrôlé, pas de crash build)",
      );
    }
    client = createClient(
      url || "https://placeholder.supabase.co",
      key || "build-time-placeholder-key",
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
