export default async function StaysTermsPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  return (
    <main style={{ padding: "48px 16px", maxWidth: 760, margin: "0 auto" }}>
      <h1>Conditions — crete.direct Stays</h1>
      <p>crete.direct agit comme <strong>intermédiaire technique</strong> : mise en relation entre un propriétaire et un voyageur, et encaissement du paiement pour le compte du propriétaire.</p>
      <p>crete.direct n&apos;est <strong>ni hébergeur, ni assureur</strong>. crete.direct n&apos;est pas partie au contrat de location, reste hors de tout litige entre les parties et ne gère aucune caution.</p>
      <p>Le propriétaire reste seul responsable de sa licence AMA, de sa déclaration fiscale grecque (CFF) et de la conformité de son logement. crete.direct n&apos;est pas garant de cette conformité.</p>
      <p>Commission : 5% ajoutés au montant réglé par le voyageur, affichés comme frais de paiement.</p>
      <p>Annulation : plus de 14 jours avant l&apos;arrivée = remboursement 100% ; 2 à 14 jours = 50% ; moins de 48 heures = 0%.</p>
    </main>
  );
}
