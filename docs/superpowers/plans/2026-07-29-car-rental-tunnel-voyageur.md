# Tunnel voyageur car-rental — paiement en ligne, versement différé, option d'annulation

Écrit le 29/07/2026. Décisions Kami du jour, prises en session.

## Ce qu'on construit, et pourquoi c'est différent de ce qui existe

Aujourd'hui, quand le client accepte une offre sur `/car-offer/{token}`, `/api/car-rental/accept`
met **client et loueur en relation** par email et le loueur encaisse comme il veut. crete.direct
ne voit jamais l'argent et facture sa commission après coup.

Demain, le client **paie sur crete.direct**. L'argent reste sur le compte plateforme, la
commission est prélevée au passage, et le solde part chez le loueur **48 h avant la prise du
véhicule**. Les coordonnées ne sont échangées qu'**après** paiement.

Ce n'est pas un ajout, c'est un **remplacement du geste final** du tunnel existant. Le modèle
facturation livré le 29/07 (`car-commission*.ts`) reste, mais **uniquement** pour les locations
conclues hors ligne. Il est désarmé (`CAR_COMMISSION_ENABLED`).

## Décisions verrouillées

| Décision | Valeur | Où elle vit |
|---|---|---|
| Flux de fonds | **Charges séparées** : encaissement sur le compte plateforme, transfert au loueur à la fermeture du droit au remboursement. On encaisse **même si le loueur n'a pas encore de compte** : son argent l'attend | `car-booking.ts` |
| Option d'annulation | 5 €, remboursement **de la totalité, option comprise**, jusqu'à 48 h avant, **rien sans l'option** | `booking-policy.ts` |
| Seuil unique | `TRANSFER_LEAD_HOURS === REFUND_WINDOW_HOURS` : aucune fenêtre de reprise de fonds | gate `check:booking-policy` |
| Vocabulaire | « option d'annulation », **jamais « assurance »** (activité réglementée) | `booking-policy.ts` |
| Armement | Éteint par défaut, valeur exacte `on` | `CAR_BOOKING_ENABLED` |

⛔ **Prérequis externe** : Stripe Connect, bloqué derrière la vérification d'identité Stripe
Identity (owner Kami). Tout ce plan se construit et se teste **sans** Connect ; seuls les appels
`transfers.create` et l'onboarding loueur en ont besoin.

## Modèle de données

Migration `20260730_car_booking.sql`, colonnes sur `car_requests` (pas de nouvelle table : une
demande donne au plus une réservation, et tout l'admin lit déjà `car_requests`).

```
booking_status            text      -- null | pending_payment | paid | transferred | cancelled | refunded
booking_amount_eur        numeric   -- prix de l'offre acceptée, snapshot au paiement
cancellation_option       boolean   not null default false
booking_session_id        text      unique
booking_payment_intent_id text
booking_paid_at           timestamptz
booking_token_hash        text      -- lien de paiement ET d'annulation, jamais en clair en base
transfer_due_at           timestamptz
transfer_id               text      -- garde d'idempotence du versement
transferred_at            timestamptz
cancelled_at              timestamptz
refund_id                 text
refund_amount_eur         numeric
```

Sur `car_partners` : `stripe_connect_account_id text unique`, `kyc_status text default 'none'`.

## Machine d'états

```
accepted ──paiement──> paid ──J-48h──> transferred
   │                     │
   │                     └──annulation──> refunded  (si option et >= 48 h)
   │                     └──annulation──> cancelled (sinon : rien rendu)
   └──offre expirée──> (inchangé, pas de réservation)
```

Invariants à tenir, tous testés :
1. Un versement n'a **jamais** lieu sur une réservation annulée.
2. Un versement n'a **jamais** lieu avant la fermeture du droit au remboursement.
3. Un remboursement n'excède **jamais** le montant payé, hors prix de l'option.
4. Aucune coordonnée de loueur n'est transmise avant `paid`.
5. `booking_session_id` unique : deux clics ne créent pas deux paiements.

## Tâches

### T1 — Migration et types
Écrire la migration, l'appliquer sur le Postgres VPS, vérifier les colonnes.
Aucune logique. Vérif : `information_schema.columns`.

### T2 — Devis payable, logique pure (TDD)
`src/lib/car-booking.ts` :
- `bookingTotalEur(quotedPriceEur, hasOption)` → prix + 5 € si option.
- `commissionCentsFor(amountEur, partnerRate)` → réutilise `commissionEur` de `car-admin.ts`,
  **ne pas réécrire la formule**.
- `partnerPayoutCents(amountEur, partnerRate)` → total − commission. L'option d'annulation
  **n'est pas** reversée au loueur : elle paie le risque porté par crete.direct.
- `buildBookingCheckoutParams(...)` → session Checkout, **sans** `transfer_data` (charges
  séparées), métadonnées `car_request_id` / `payment_type: "car_booking"` / `brand`.
Invariant : `partnerPayout + commission + optionPrice === total`, au centime.

### T3 — Gate CI `check:car-booking`
Mêmes fonctions que la route. Vérifie l'invariant de T2 sur des tarifs non ronds, l'absence de
`transfer_data`, et que l'option n'entre pas dans le payout loueur.
Brancher dans `npm run check`.

### T4 — Route de paiement (TDD)
`POST /api/car-rental/booking` : jeton → demande `accepted` non payée → session Checkout →
`booking_status = pending_payment`. Erreurs Stripe habillées par `lib/stripe-errors.ts`
(503 `payouts_unavailable` / 502 `payment_provider`), jamais de 500 brut.
Désarmée par `CAR_BOOKING_ENABLED !== "on"`.

### T5 — Webhook paiement (TDD)
Étendre `/api/car-rental/commission/webhook` **ou** créer un endpoint dédié — trancher à
l'écriture selon la lisibilité. Discriminant `payment_type: "car_booking"`.
À la réception : `paid`, `booking_paid_at`, `transfer_due_at = transferDueAt(date_from)`,
puis **et seulement là** envoi des coordonnées au client et au loueur.
Registre `stripe_webhook_events` avec `scope: 'car'`.

### T6 — Cron de versement (TDD)
`/api/cron/car-transfers`, protégé par `CRON_SECRET`, une passe quotidienne :
sélectionne les réservations `paid` dont `shouldTransferNow()` est vrai, crée le
`transfers.create` vers le compte connecté du loueur, écrit `transfer_id` et `transferred_at`.
Idempotent, rattrape les retards, ignore les annulées. **Cette tâche seule exige Connect** pour
tourner en vrai ; elle se teste entièrement en mock.

### T7 — Annulation client (TDD)
`POST /api/car-rental/booking/cancel` : jeton → calcule `refundDueEur` → si dû, `refunds.create`
sur le compte plateforme (**pas** de `reverse_transfer` : rien n'a été transféré) → `refunded`,
sinon `cancelled`. Refuse toute annulation d'une réservation déjà `transferred` : à ce stade
l'argent est parti et la fenêtre est fermée par construction.

### T8 — Pages et emails
Page de paiement (récapitulatif, case à cocher option 5 € avec son libellé exact), page
d'annulation, confirmation. Emails client et loueur en anglais côté loueur, locale client côté
client. En/fr/de/el.

### T9 — Onboarding Connect des loueurs
Lien d'onboarding Express par loueur depuis `/admin/car-rental`, `kyc_status` suivi.
⛔ Bloqué tant que Connect n'est pas activé.

### T10 — Armement
Poser `CAR_BOOKING_ENABLED=on` sur Vercel **puis redéployer**, activer l'endpoint webhook
**après** avoir vérifié que la route répond 400 et non 404 en prod. Rejouer la chaîne complète
contre la base de production, nettoyer, prouver le retour à l'état initial.

## Ordre et dépendances

T1 → T2 → T3 → T4 → T5 → T7 → T8 peuvent être faits **sans Connect**.
T6 se code et se teste sans Connect, ne tourne pas sans.
T9 puis T10 exigent Connect.

## Ce qui n'est pas dans ce plan

- La caution du véhicule : elle reste entre le loueur et le client, crete.direct n'y touche pas.
- Les litiges et dommages : hors périmètre, le contrat de location reste celui du loueur.
- Le changement de dates : une modification = annulation puis nouvelle réservation.


## Bascule du 29/07/2026 22:30 — charges séparées → charge de destination

**Décision Kami**, après avoir formulé l'argument que je n'avais pas trouvé : « c'est leur
argent et on n'y touche jamais, la somme est bloquée par Stripe jusqu'à la réservation ».

Le premier jet plaçait le paiement sur le compte plateforme, puis transférait au loueur.
C'était défendable techniquement mais faux commercialement, et cela faisait de crete.direct
un détenteur de fonds de tiers.

**Le modèle retenu** : `transfer_data.destination` vers le compte du loueur, commission et
option prélevées par `application_fee_amount`. Le compte connecté est créé en versement
`manual`, donc les fonds restent bloqués chez Stripe. Le cron déclenche le `payouts.create`
**au nom du loueur** 48 h avant la prise. Une annulation avant cette échéance rembourse avec
`reverse_transfer` sans créer le moindre découvert.

**Trois gains** : on peut dire au loueur « c'est votre argent » sans mentir ; crete.direct
n'encaisse jamais pour le compte d'un tiers, donc la qualification de service de paiement ne
se pose plus ; et aucun fonds de tiers ne transite par les comptes de NovAI.

**Une contrainte découverte** : `reverse_transfer` et `refund_application_fee` reversent
**proportionnellement** au montant remboursé, sans réglage fin possible. Retenir les 5 € de
l'option laisserait donc des centimes indus des deux côtés. D'où la règle simplifiée :
**annulation dans les délais, tout est rendu, option comprise**. C'est aussi ce qui se dit
le mieux.

**Le gate `check:car-booking` a été inversé** : il exigeait l'absence de `transfer_data`, il
exige maintenant sa présence et vérifie que payout + application fee = total, au centime.


## Arbitrage final du 29/07/2026 23:15 — retour aux charges séparées

Trois itérations sur ce flux dans la même journée. La dernière est la bonne, et
c'est une décision commerciale, pas technique.

**Ce qui a tranché** (Kami) : « on force les gens à s'inscrire, ils le feront pour
récupérer leur argent. »

La charge de destination exige que le loueur ait **déjà** un compte connecté :
Stripe refuse d'encaisser sinon. Il faudrait donc convaincre chaque loueur d'ouvrir
un compte Stripe **avant** qu'il ait vu le moindre euro. Un partenaire sans preuve
de revenu n'a aucune raison de faire cet effort, et le tunnel ne démarrerait jamais.

En encaissant d'abord, le rapport s'inverse : on n'a plus rien à demander, on
annonce. « 279 € vous attendent, ouvrez votre compte pour les recevoir. » Le levier
est dans l'argent, pas dans l'email.

**Ce qu'on accepte en échange** : crete.direct porte les fonds entre l'encaissement
et le versement. C'est une position d'encaisseur au sens comptable, et la question
de la qualification en service de paiement reste ouverte. ⛔ **À poser à Stelios**,
en même temps que celle de Stays et de l'IKE. Owner Kami, butoir 15/08/2026.

**Ce qui reste vrai des deux tentatives précédentes** : le seuil unique à 48 h,
l'invariant « aucune fenêtre de reprise de fonds », le remboursement intégral option
comprise, la machine d'états, les pages et le webhook. Seule la plomberie a bougé.

**Le remboursement intégral n'est plus une contrainte technique** : sans
`reverse_transfer`, on pourrait retenir les 5 €. On garde « tout est rendu » par
choix produit, parce que ça se dit mieux et que l'option reste rentable sur ceux
qui n'annulent pas.
