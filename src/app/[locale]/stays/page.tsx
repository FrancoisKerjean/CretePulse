import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export default async function StaysIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data } = await supabaseAdmin
    .from("stay_listings").select("slug,title,photos,base_price_eur")
    .eq("status", "published").order("created_at", { ascending: false }).limit(60);
  const listings = data ?? [];
  return (
    <main style={{ padding: "48px 16px", maxWidth: 1080, margin: "0 auto" }}>
      <h1>Louez en direct. Sans le racket Airbnb.</h1>
      <p><Link href={`/${locale}/stays/new`}>Vous êtes propriétaire ? Publiez en 1 minute →</Link></p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
        {listings.map((l: { slug: string; title: string | null; photos: string[]; base_price_eur: number }) => (
          <Link key={l.slug} href={`/${locale}/stays/${l.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            {l.photos?.[0] && <img src={l.photos[0]} alt={l.title ?? ""} style={{ width: "100%", borderRadius: 12 }} />}
            <h3>{l.title}</h3>
            <p>{l.base_price_eur} € + 5%</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
