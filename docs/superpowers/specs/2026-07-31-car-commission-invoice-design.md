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

⛔ **Première instruction du cron : `assertCron(request)`**, comme les six crons existants
(`@/lib/cron-auth`). **Deuxième : la garde d'armement `CAR_COMMISSION_ENABLED === "on"`,
qui rend immédiatement sans rien lire ni écrire.** Voir « Piège de l'interrupteur » ci-dessous.

Sélection :

```
accepted_at IS NOT NULL
AND outcome IS NULL                           -- ⛔ voir ci-dessous
AND date_from <= CURRENT_DATE
AND date_from >= COMMISSION_INVOICING_START   -- borne de mise en service
AND booking_paid_at IS NULL
AND quoted_by_partner_id IS NOT NULL
AND quoted_price IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM car_commission_invoices i WHERE i.request_id = car_requests.id)
```

⛔ **`outcome IS NULL` n'est pas décoratif.** Une location que l'admin a marquée `lost`
— annulée, voyageur jamais venu — garde son `accepted_at` et sa `date_from` passée. Sans
ce filtre, le cron la ressuscite en `rented` et facture un loueur pour une location dont
on sait déjà qu'elle n'a pas eu lieu.

⛔ **Le `NOT EXISTS` sur la facture est le vrai filtre d'idempotence, pas
`commission_requested_at IS NULL`.** `requestCommission` **relâche son verrou** en cas
d'échec (`releaseLock`) : la ligne redevient donc éligible, ce qui est voulu pour
réessayer, mais l'insertion buterait alors sur `request_id UNIQUE`. Comportement attendu
sur une facture déjà en table et jamais envoyée (`sent_at IS NULL`) : **réutiliser la
facture existante et retenter l'envoi**, jamais en créer une seconde, jamais échouer.

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

### 2bis. ⛔ Le piège de l'interrupteur — le défaut le plus grave de ce design

`CAR_COMMISSION_ENABLED` n'est testé **que** dans `requestCommission`, en toute première
ligne, précisément pour que rien ne soit tenté ni écrit quand le système est éteint.

Or le cron écrit `outcome`, `final_amount_eur` et `commission_eur` **avant** cet appel.
Conséquence, avec l'interrupteur éteint — son état par défaut, et son état aujourd'hui :
aucune facture ne part, mais **toutes les locations en cours sont marquées « louée » avec
un montant présumé**. Les données sont polluées en silence, et c'est exactement ce que
l'interrupteur devait empêcher.

**Règle : le cron teste l'armement lui-même, avant sa première lecture.** L'interrupteur
protège deux appelants distincts, il doit être vérifié par chacun. La garde dans
`requestCommission` reste, elle ne suffit plus.

⚠️ Corollaire pour le mode d'essai : un cron désarmé ne doit rien écrire du tout, pas même
un `outcome`. S'il faut voir ce qu'il ferait, c'est par journalisation, jamais par écriture.

### 3. Table `car_commission_invoices`

| Colonne | Note |
|---|---|
| `id` | identity |
| `number` | `NOVAI-CD-<année>-NNN`, **séquence Postgres dédiée** (atomique, pas de course) |
| `request_id` | **UNIQUE**, référence `car_requests` |
| `partner_id` | référence `car_partners` |
| `base_amount_eur`, `rate`, `amount_eur` | assiette, taux, commission |
| `token` | aléatoire non devinable, URL publique |
| `issued_at`, `sent_at`, `paid_at` | `sent_at` NULL = numérotée mais jamais partie |
| `credited_at`, `credit_number`, `credit_reason` | avoir |

⛔ `request_id UNIQUE` donne une **idempotence structurelle**, en plus du verrou
applicatif existant : deux exécutions du cron ne peuvent pas produire deux factures,
même si le verrou est relâché entre-temps.

⛔ **L'année fait partie du numéro, la séquence ne la connaît pas.** Une séquence
Postgres nue continue de compter au 1er janvier : elle produirait `NOVAI-CD-2026-012`
en 2027. Le numéro se compose donc de l'année courante **et** d'un compteur remis à 1
à chaque changement d'année, l'unicité étant garantie par une contrainte sur `number`.
Un test doit couvrir le passage d'année, sinon le défaut ne se verra que le 1er janvier.

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

### 5bis. Webhook — à modifier, il n'est pas complet aujourd'hui

`api/car-rental/commission/webhook` n'écrit que sur `car_requests`
(`commission_paid_at`, `commission_payment_intent_id`). Il doit désormais écrire aussi
`paid_at` sur `car_commission_invoices`, sinon la page facture continuera d'afficher
« due » sur une facture réglée. Ce n'est pas un détail de test : c'est une modification
de fichier existant, à porter explicitement dans le plan.

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
  payée en ligne · sans partenaire · sans `quoted_price` · commission sous 0,50 € ·
  **`outcome='lost'` déjà posé, la ligne ne doit PAS être reprise**
- **Interrupteur** : `CAR_COMMISSION_ENABLED` absent, `"true"` ou `"1"` → le cron ne fait
  **aucune écriture**, y compris aucun `outcome`. Test central, il verrouille le défaut 2bis
- **Passage d'année** : dernier numéro de N, premier numéro de N+1, le compteur repart à 1
- **Reprise** : facture en table avec `sent_at IS NULL` → le cron réutilise et renvoie,
  il ne crée pas de seconde facture et ne lève pas sur `request_id UNIQUE`
- **Numérotation** : deux appels concurrents rendent deux numéros distincts, aucun trou réutilisé
- **Idempotence** : deux exécutions du cron le même jour produisent une seule facture
- **Ordre d'écriture** : Resend échoue → la facture existe, `sent_at` est NULL, elle est renvoyable
- **Avoir** : montant, numéro dans la même série, état de la demande
- **Webhook** : `commission_paid_at` sur la demande et `paid_at` sur la facture
- **Armement** : `CAR_COMMISSION_ENABLED` absent ou `"true"` → le cron n'écrit rien

## À trancher au déploiement, pas au codage

⚠️ **`car_requests id=39` part le 07/08** (Luxtrans, 200 €, commission 20 €) et figure en
mémoire comme « +20 € Hersonissos à facturer après le 14/08 », c'est-à-dire à la main et
après la fin de location. **Si le cron est armé avant le 07/08, il la facturera tout seul
le 07.** Il faut alors renoncer à la facture manuelle, sinon Luxtrans reçoit deux fois la
même commission. Choisir explicitement : armer après le 07/08, ou armer avant et annuler
la facture manuelle prévue.

⚠️ **Fuseau.** Le cron est à **05:00 UTC**, soit 08:00 à Athènes : même jour civil des deux
côtés, `CURRENT_DATE` est donc sans ambiguïté. Déplacer ce cron en soirée UTC casserait
cette propriété et facturerait un jour trop tôt côté grec.

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
