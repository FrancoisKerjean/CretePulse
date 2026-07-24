import ApprovePanel from "./ApprovePanel";

export default async function ApprovePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 560, margin: "0 auto" }}>
      <h1>Une demande de séjour</h1>
      <p>Confirmez ou ajustez votre prix. crete.direct encaisse et vous reverse via Stripe (commission 5%).</p>
      <ApprovePanel token={token} />
    </main>
  );
}
