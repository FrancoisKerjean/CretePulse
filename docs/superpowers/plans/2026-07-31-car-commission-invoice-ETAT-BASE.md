# Facturation loueur : état réel de la base au 31/07/2026

Note écrite par un autre terminal, à lire avant d'armer le cron du plan
`2026-07-31-car-commission-invoice.md`. Elle ne demande aucun changement de conception :
elle signale que **les données sur lesquelles le plan s'appuie ont bougé aujourd'hui**, et
pourquoi.

## 1. Les deux lignes citées par le plan ont été traitées à la main

`car_requests id=39` et `id=27` ne sont plus `outcome IS NULL`. Elles sortent donc de la
sélection du cron.

| id | Avant | Après | Motif |
|----|-------|-------|-------|
| 39 | `accepted`, `outcome` vide, `quoted_price=200` | `outcome='lost'`, montants **laissés vides** | le devis de 200 € a été **rétracté par le loueur** |
| 27 | `accepted`, `outcome` vide, `quoted_price=680` | `outcome='rented'`, `final_amount_eur=680`, `commission_eur=68` | la facture **existe déjà**, émise à la main le 30/07 |

Les deux `admin_note` portent le détail complet et les identifiants de courrier.

## 2. Pourquoi `id=39` ne devait surtout pas être facturée

C'est la demande de Nabila, Hersonissos, 7 au 14 août. Le loueur a envoyé 200 € par le
formulaire de devis, puis a **annulé 37 minutes après** notre mail « Booking confirmed » :
son prix était pensé pour 2 jours et la demande en portait 7. Il a ensuite renégocié en
WhatsApp direct avec la cliente, à 500, 525 ou 620 € selon la voiture.

Le plan calcule `invoiceAmounts(row.quoted_price, ...)` puis écrit `final_amount_eur =
amounts.base`. Sur cette ligne, cela aurait produit une facture de **20 €** sur un prix de
200 € **qui n'a jamais existé**, alors que la commission réelle vaut 0 € (si la cliente
renonce) ou 50 à 62 € (si elle loue).

⚠️ **Les fixtures du plan sont bâties sur cette ligne** : `id: 39`, `quoted_price: 200`,
`base: 200, rate: 0.1, amount: 20`. Les tests restent valides comme tests, mais leur exemple
ne décrit plus la réalité de la base.

## 3. Le point de fond, à arbitrer et non tranché ici

`quoted_price` est un prix **annoncé**, pas un prix **conclu**.

En `lead_routing = direct`, la transaction se termine hors du produit, par téléphone ou
WhatsApp : surclassement, jour supplémentaire, remise, correction d'erreur. **L'écart entre
annoncé et conclu est donc le cas normal, pas l'exception.** Facturer automatiquement sur
`quoted_price` revient à supposer que le devis est toujours tenu, ce que le cas 39 vient de
démentir sur la première location observée.

## 4. Pourquoi `id=27` était le risque le plus coûteux

Le point 8 de l'audit du plan avait repéré une collision entre facture manuelle et facture
automatique, sur `id=39`. **Le vrai doublon était sur `id=27`** : sa facture
`NOVAI-2026-003` de 68 € a été émise, envoyée et délivrée le 30/07, mais
`commission_requested_at` était resté **vide** en base. Le geste humain était invisible au
système. Armé après le 11/08, le cron aurait refacturé 68 € au partenaire le plus actif du
roster, qui venait de payer.

## 5. Ce qui reste éligible, et qui est légitime

| id | Loueur | Début | Devis | Commission |
|----|--------|-------|-------|-----------|
| 33 | Zakros Tours | 08/09/2026 | 280 € | 28 € |
| 25 | Zorbas Rent a Car | 25/09/2026 | 310 € | 31 € |

Ces deux commissions sont réellement dues et n'ont jamais été facturées. Le cron les prendra
à raison.

## 6. La règle qui se dégage des deux corrections

**Avant d'armer, rejouer la requête de sélection et lire les lignes une par une.** Les deux
problèmes se sont vus ainsi, pas en relisant le code : ils ne venaient pas d'un défaut de
logique mais de l'écart entre ce qui a été fait à la main et ce que la base en sait.

## 7. Autre changement du jour, sans conflit

Le commit `226333a` sur `master` touche la page de devis loueur (`car-quote/[token]`) pour
lui rendre le prix par jour, et ajoute `perDayAmount()` dans `src/lib/car-pricing.ts`. Aucun
fichier commun avec le plan de facturation.
