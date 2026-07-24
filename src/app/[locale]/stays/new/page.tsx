import NewListingWizard from "./NewListingWizard";

export default async function StaysNewPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <main style={{ padding: "48px 16px" }}>
      <h1>Publiez votre logement</h1>
      <p>Collez votre lien Airbnb. Vous gardez votre calendrier. Nous prenons 5%, pas 15%.</p>
      <NewListingWizard />
    </main>
  );
}
