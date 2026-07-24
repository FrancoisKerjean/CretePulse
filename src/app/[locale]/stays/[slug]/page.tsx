import { getListingBySlug } from "@/lib/stays/db";
import RequestForm from "./RequestForm";
import { notFound } from "next/navigation";

export default async function StayDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "published") notFound();
  return (
    <main style={{ padding: "48px 16px", maxWidth: 720, margin: "0 auto" }}>
      <h1>{listing.title}</h1>
      {listing.photos?.[0] && <img src={listing.photos[0]} alt={listing.title ?? ""} style={{ width: "100%", borderRadius: 12 }} />}
      <p>{listing.description}</p>
      <p><strong>Prix indicatif :</strong> {listing.base_price_eur} € (le propriétaire confirme à l&apos;acceptation)</p>
      <p style={{ color: "#6B7280" }}>Vous payez le prix affiché + 5% de frais de paiement. Pas de racket Airbnb.</p>
      <RequestForm slug={listing.slug} />
    </main>
  );
}
