import PayButton from "./PayButton";

export default async function PayPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 560, margin: "0 auto" }}>
      <h1>Confirmez votre séjour</h1>
      <p>Réglez l&apos;acompte de 30% pour bloquer vos dates. Le solde sera demandé 14 jours avant l&apos;arrivée.</p>
      <PayButton token={token} locale={locale} />
    </main>
  );
}
