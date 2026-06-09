import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client with service-role privileges.
// Used by API routes that must WRITE to tables the public anon role cannot
// (e.g. newsletter_subscribers, where anon lacks INSERT/UPDATE grants).
// NEVER import this from a client component — the key must stay server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
