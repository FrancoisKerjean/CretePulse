# Catalogue et acompte : ce qui reste avant d'allumer `CAR_CATALOGUE_ENABLED`

Branche `feat/car-catalogue`, livrée éteinte. État au 26/11/2026, après la revue finale et sa vague de correction (9e2a732..f889459, 1617 tests verts, `next build` vert).
Avec l'interrupteur éteint, rien ici ne peut déplacer d'argent ni faire passer une coordonnée : la revue finale a vérifié que les parcours voyageur sont inchangés, hors la ligne d'assurance désormais traduite.

## Verrous de code (une petite branche avant l'allumage)
1. ✅ Réglé le 26/11 (branche feat/car-allumage, 84a16d8). **Accept par l'ancien chemin pendant un paiement en cours.** Dans `src/app/api/car-rental/accept/route.ts`, le chemin de mise en relation doit répondre 409 `inProgress` quand `booking_status` est dans `DEPOSIT_HOLDS`. Sa mise à jour doit aussi être conditionnée à `status = 'quoted'`. Sans cela, sur une page qui mélange des offres avec et sans acompte, un acompte payé chez A peut se retrouver rattaché à B.
2. ✅ Réglé le 26/11 (branche feat/car-allumage, bc59055), ⚠️ migration `supabase/migrations/20261127_car_booking_locked_at.sql` à appliquer en prod AVANT le ship du code. **Verrou `pending_payment` sans id de session.** Il est posé si la fonction meurt entre la pose du verrou et l'écriture de la session. Corriger par une migration `booking_locked_at timestamptz`, puis la libération par le cron `car-deposit-deadline` après 35 min, avec une seule alerte. Aucun argent n'est pris dans ce cas.
3. ✅ Réglé le 26/11 (branche feat/car-allumage, d9fe46c). Mineurs, à régler dans la même branche :
   - après un remboursement, l'ancien chemin laisse `booking_status = refunded` avec `status = accepted` (car-offer page.tsx:432) : rien à changer, l'ancien chemin efface `accept_token_hash`, la page n'est plus joignable dans cet état (commentaire posé) ;
   - texte de la vue `noPartner` de l'assistant (CarRentalWizard.tsx:612-640), qui contredit l'e-mail `noAgency` : nouvelle vue « demande reçue » ;
   - pas d'alerte quand Stripe refuse une session de façon durable : une alerte après 1 h de verrou, une seule ;
   - « paiement déjà ouvert » affiché après une réconciliation payée : `booked`, la page se recharge sur l'état réel.
4. ✅ Sans objet, vérifié le 26/11 (branche feat/car-allumage, f2cbd2d) : `sendCustomerQuoteEmail` n'a plus d'appelant depuis 8e5799b (08/07/2026). L'e-mail envoyé à chaque offre est `sendCustomerNewOffer`, sans ces lignes ; un test le fige dans les 4 langues. La fonction morte reste à supprimer ou non. **E-mail « nouvelle offre » (`sendCustomerQuoteEmail`, email.ts:758) :** il garde les lignes `reassure` de `sharedOfferCopy`, dont « No online prepayment, no card needed to book ». Interrupteur allumé, cette phrase contredit l'acompte, alors que la page d'offre la remplace déjà (car-offer page.tsx:304). Correction : même remplacement dans l'e-mail quand l'offre se réserve par acompte.
5. ✅ Réglé le 26/11 (branche fix/car-deposit-mails) :
   - intertitres grecs en capitales sans tonos, dans tous les e-mails ;
   - phrase d'annulation en tête de l'e-mail client d'annulation ;
   - sujets loueur courts ;
   - plus aucun tiret cadratin dans les e-mails en service (sujets « Crete Direct », relance sans offre, accueil partenaire, textes d'offre partagés).
6. 🔎 Lieu de prise en libellé latin (« Heraklion Airport ») dans les 4 langues : c'est le choix de tout le produit voiture (assistant compris). Il faudrait le changer partout, pas seulement dans les e-mails.

## Contrôles (Claude, avant allumage)
- Parcours complet en mode test Stripe : formulaire, offre de grille, paiement 4242, confirmation loueur, annulation à plus de 48 h, échéance dépassée qui rembourse. À faire avec un loueur de test et les adresses de François uniquement. Il faut une clé Stripe de test, la CLI Stripe et la clé service en local, ce qui manque au 26/11.
- Contrôle navigateur des vues allumées : étapes 3 et 4 de l'assistant, page d'offre, page de réservation, panneau d'annulation, page de confirmation loueur, admin, en mobile et sur ordinateur.
- Endpoint Stripe abonné à `checkout.session.expired`.
- `CAR_ADMIN_SECRET` d'au moins 24 caractères en Production.
- Variables nécessaires : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_CAR`, `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, et les variables Telegram ops.
- Surveiller les remboursements carte en attente ou en échec (`charge.refund.updated`) les premières semaines.

## Décisions de François
- Relecture des aperçus d'e-mails (`docs/mockups/car-deposit-mails/index.html`) et de la page de conditions.
- « Pas de voiture au comptoir » : la spec section 8 le compte pour la suspension, mais la page de conditions ne le cite pas parmi les trois manquements.
- Événements Plausible de la spec section 12 (`car_booking_confirmed`, `car_deposit_refunded`) : à ajouter, ou à abandonner au profit des KPI admin.
- ⛔ Validation comptable de la décision 5 (acompte = commission, facturation), avant l'allumage. Butoir 01/03/2027.
- Courrier aux 10 loueurs actifs : grille à vérifier, conditions 2027, lien de portail. Texte validé par François, signé Kami.
- Un paiement réel de bout en bout, puis remboursé.
- Allumage quand au moins 5 grilles sont publiées. Cible : avant le 01/04/2027.
