# Facturation automatique de la commission loueur — design

Date : 2026-07-31
Statut : validé par Kami, prêt pour plan d'implémentation

## But

Émettre automatiquement, **le premier jour de la location**, la facture de commission
10 % au loueur qui a gagné la demande, avec un lien de paiement, sans aucun geste manuel.

## Ce qui existe déjà et NE DOIT PAS être reconstruit

Livré le 29/07/2026, déployé en production, **désarmé** :

| Fichier | Rôle |
|---|---|
| `src/lib/car-commission.ts` | Gardes d'idempotence, minimum Stripe 0,50 €, sujet et corps de l'email |
| `src/lib/car-commission-server.ts` | `requestCommission()`, verrou optimiste, appel Stripe, envoi Resend |
| `src/app/api/car-rental/commission/webhook/route.ts` | Webhook Stripe, coche `commission_paid_at` |
| `scripts/check-car-commission.mjs` | Contrôle |
| `supabase/migrations/20260729_car_commission_stripe.sql` | `commission_session_id`, `commission_payment_intent_id`, `commission_requested_at`, `stripe_webhook_events.scope` |

Décisions déjà prises le 29/07 et **conservées telles quelles** :

- Le paiement de la commission va **droit sur le compte plateforme**, sans `transfer_data`
  ni compte connecté. Conséquence voulue : **ce flux fonctionne Stripe Connect fermé**,
  contrairement au tunnel Stays. Ne pas y introduire de dépendance à Connect.
- L'interrupteur `CAR_COMMISSION_ENABLED` n'arme que sur la valeur **exacte** `"on"` ;
  `"true"` et `"1"` laissent le système éteint. Il est figé dans l'image du déploiement,
  donc le poser sur Vercel exige un redéploiement.
- Le verrou optimiste passe `commission_requested_at` de NULL à maintenant **avant**
  l'appel Stripe, et seul l'appel qui remporte l'update continue.
- Emails aux loueurs en anglais, un seul canal, une seule langue.

## Décisions de ce design

1. **Périmètre** : uniquement les locations payées **en direct au loueur**
   (`booking_paid_at IS NULL`). Quand le paiement crete.direct prendra le relais,
   la commission sera déduite en amont et ces locations n'entreront jamais ici.
2. **Annulation** : facture émise au J1, **avoir** si le loueur signale que la location
   n'a pas eu lieu. Une facture émise ne se supprime pas.
3. **Numérotation** : **série dédiée `NOVAI-CD-2026-NNN`**, indépendante de la séquence
   société `NOVAI-2026-NNN` tenue à la main. Plusieurs séries sont licites dès lors que
   chacune est continue. Supprime toute collision entre le cron et une facture manuelle.
4. **Règlement** : lien Stripe sur la facture, **IBAN conservé** en repli.
5. **Assiette** : `quoted_price`, le prix du devis accepté par le voyageur — le seul
   montant contractuel connu au premier jour. Régularisation manuelle si le loueur
   signale un écart.

## Architecture

### 1. Cron `car-commission-invoice`

Quotidien, **05:00 UTC**, 7ᵉ entrée de `vercel.json`.

Sélection :

```
accepted_at IS NOT NULL
AND date_from <= CURRENT_DATE
AND date_from >= COMMISSION_INVOICING_START   -- borne de mise en service
AND booking_paid_at IS NULL
AND quoted_by_partner_id IS NOT NULL
AND commission_requested_at IS NULL
AND quoted_price IS NOT NULL
```

⛔ **`<=` et non `=`.** Avec l'égalité, une seule journée de panne du cron perd la
facture définitivement, sans trace. Le `<=` fait du cron son propre rattrapage.

⛔ **`COMMISSION_INVOICING_START` est obligatoire, pas cosmétique.** Sans cette borne,
le premier tir rattrape tout l'historique et refacture `car_requests id=27`, déjà
facturée à la main le 30/07 (`NOVAI-2026-003`, 68 €). Valeur retenue : le lendemain
du déploiement.

### 2. Bascule sans clic

Pour chaque ligne retenue, le cron reproduit ce que fait `setOutcome` :

- `final_amount_eur = quoted_price`
- `commission_eur = commissionEur(quoted_price, partner.commission)` — snapshot au taux
  du jour, l'édition ultérieure du taux ne réécrit pas l'historique facturable
- `outcome = 'rented'`, `outcome_at = now()`

puis appelle `requestCommission(id)`. L'ordre compte : `shouldRequestCommission` exige
`outcome === 'rented'`, donc la bascule précède l'appel, dans la même passe.

⚠️ Marquer « louée » le jour du départ affirme quelque chose qui n'est pas encore
vérifié. C'est assumé : c'est la contrepartie de la décision « facture au J1, avoir
si ça n'a pas roulé », et `shouldRequestCommission` exige `outcome === 'rented'`.

### 3. Table `car_commission_invoices`

| Colonne | Note |
|---|---|
| `id` | identity |
| `number` | `NOVAI-CD-2026-NNN`, **séquence Postgres dédiée** (atomique, pas de course) |
| `request_id` | **UNIQUE**, référence `car_requests` |
| `partner_id` | référence `car_partners` |
| `base_amount_eur`, `rate`, `amount_eur` | assiette, taux, commission |
| `token` | aléatoire non devinable, URL publique |
| `issued_at`, `sent_at`, `paid_at` | `sent_at` NULL = numérotée mais jamais partie |
| `credited_at`, `credit_number`, `credit_reason` | avoir |

⛔ `request_id UNIQUE` donne une **idempotence structurelle**, en plus du verrou
applicatif existant : deux exécutions du cron ne peuvent pas produire deux factures,
même si le verrou est relâché entre-temps.

⛔ **Ordre d'écriture non négociable : numéroter et enregistrer AVANT d'envoyer.**
`sent_at` ne se remplit que si Resend accepte (lire `{ error }`, l'API ne lève pas sur
refus). Une facture numérotée non envoyée se renvoie depuis l'admin ; une facture
envoyée non enregistrée est perdue.

### 4. Page `/[locale]/invoice/[token]`

Publique **par conception** — le loueur n'a pas de compte — protégée par
l'imprévisibilité du token, `noindex`. Reprend le gabarit
`~/docs/facture-novai-luxtrans-2026-003.html` : entête NovAI, IBAN/BIC, mentions
L441-10 et D441-5, franchise 293 B CGI. Affiche l'état (due / payée / annulée par avoir)
et le bouton de paiement.

⛔ **La session Stripe Checkout se crée au clic sur cette page, jamais dans le cron.**
Une session expire en 24 h : celle créée à 5 h du matin serait morte avant que le loueur
ouvre son courrier.

### 4bis. Conséquence sur `requestCommission` — à ne pas manquer

La règle ci-dessus **contredit le comportement actuel** de `requestCommission`, qui pose
le verrou, crée la session Stripe et envoie l'email d'un seul tenant. C'est cohérent
tant que le déclencheur est un clic humain synchrone ; ça ne l'est plus avec un cron
nocturne.

`requestCommission` est donc **scindé en deux**, sans changer ses gardes :

- `requestCommission()` — verrou, snapshot, **création de la facture**, email vers la
  page facture. Ne parle plus à Stripe.
- `ensureCommissionCheckout(invoiceToken)` — appelée par la page au clic, crée la session
  et écrit `commission_session_id` / `commission_payment_intent_id`. Réutilise une
  session existante si elle n'a pas expiré.

⛔ **Les deux chemins convergent** : le clic « louée » du back-office et le cron appellent
la même fonction et produisent la même facture. Il ne doit pas exister deux façons de
facturer un loueur.

⚠️ L'unicité `car_requests_commission_session_idx` posée le 29/07 reste valide : elle
porte sur `commission_session_id`, désormais écrit par `ensureCommissionCheckout`.

### 5. Email

Réutilise `commissionRequestSubject` et `commissionRequestBody`. Deux retouches :

- « Rental amount you collected » devient le montant du devis accepté : au J1 on ne sait
  pas ce qui a été encaissé, et écrire le contraire serait faux.
- `payUrl` pointe vers la page facture, plus vers l'URL Stripe directe.

### 6. Avoir

Action dans `/admin/car-rental` : « la location n'a pas eu lieu » → avoir numéroté dans
la même série, email au loueur, `outcome='lost'`, `commission_paid_at=null`.
Si la commission était déjà réglée, le remboursement Stripe reste **manuel** : trop rare
pour justifier du code.

## Gestion d'erreur

| Cas | Comportement |
|---|---|
| Resend refuse | Facture enregistrée et numérotée, `sent_at` NULL, renvoi depuis l'admin |
| Stripe indisponible | Sans effet : la session naît au clic, la facture reste payable par virement |
| Cron en panne un jour | Rattrapé le lendemain par `date_from <= CURRENT_DATE` |
| Loueur sans email | Facture enregistrée, journalisée, non envoyée, visible dans l'admin |
| Commission < 0,50 € | Écartée par `shouldRequestCommission`, garde existante |
| Deux exécutions simultanées | `request_id UNIQUE` + verrou `commission_requested_at` |

## Tests (TDD)

- **Sélection** : jour J · en retard · avant `COMMISSION_INVOICING_START` · déjà facturée ·
  payée en ligne · sans partenaire · sans `quoted_price` · commission sous 0,50 €
- **Numérotation** : deux appels concurrents rendent deux numéros distincts, aucun trou réutilisé
- **Idempotence** : deux exécutions du cron le même jour produisent une seule facture
- **Ordre d'écriture** : Resend échoue → la facture existe, `sent_at` est NULL, elle est renvoyable
- **Avoir** : montant, numéro dans la même série, état de la demande
- **Webhook** : `commission_paid_at` sur la demande et `paid_at` sur la facture
- **Armement** : `CAR_COMMISSION_ENABLED` absent ou `"true"` → le cron n'écrit rien

## Hors périmètre

- Génération PDF. La page se transforme en PDF par impression. Si un loueur ou son
  comptable réclame une pièce jointe, on ajoute `@sparticuz/chromium` sans rien jeter :
  le gabarit HTML est déjà écrit.
- Relance des factures impayées.
- Remboursement Stripe automatique sur avoir.
- **Régularisation d'écart entre le devis et le montant réellement encaissé.** Si un
  loueur signale avoir facturé autre chose que le devis, l'ajustement se fait à la main
  (avoir puis nouvelle facture). Aucune mécanique automatique de rattrapage : ce cas
  ne s'est jamais présenté et l'automatiser d'avance serait de la spéculation.
- Facturation des verticales activités et van, qui ont leurs propres modèles.
