# Issue de location et commission : confirmation loueur, rattrapage, relance de facture

Date : 2026-09-07
Statut : brouillon de design, à valider avant plan d'implémentation
Branche : `feat/specs-360-2026-09` (worktree `~/cp-specs-360`), dépôt crete.direct, Next.js 16, Postgres self-hosted derrière PostgREST
Spec amont : `docs/superpowers/specs/2026-07-31-car-commission-invoice-design.md` (cron de facturation au premier jour)

## 0. Recadrage de la mesure du 07/09, à lire avant tout

La mesure dit : 4 demandes `accepted` sans `outcome` (ids 25, 33, 48, 62), donc ~128 € de commission jamais facturés, « parce que le cron `car-commission-invoice` ne facture que `outcome = rented` ».

Le code dit autre chose. `src/app/api/cron/car-commission-invoice/route.ts` sélectionne **`outcome IS NULL`** (ligne `.is("outcome", null)`), puis **pose lui-même** `outcome = 'rented'`, `final_amount_eur = quoted_price`, `commission_eur`, et appelle `requestCommission()` (`src/lib/car-commission-server.ts`). La garde pure est `isInvoiceable()` dans `src/lib/car-invoice.ts` : `accepted_at` non nul, `outcome` nul, `booking_paid_at` nul, loueur et prix présents, **`date_from >= COMMISSION_INVOICING_START` (2026-08-05)** et **`date_from <= aujourd'hui`**. Le cron tourne à 05:00 UTC, armé par `CAR_COMMISSION_ENABLED === "on"`.

Conséquences :

- Une demande `accepted` sans `outcome` dont le départ est **futur** n'est pas un oubli : c'est l'état normal avant le J1. `33` démarre le 08/09 : si le cron est armé et la fiche du loueur complète, elle recevra `NOVAI-CD-2026-002` le 08/09 à 08:00 Athènes sans aucun geste. Même chose pour `48` et `62` à leur `date_from`.
- La facture `NOVAI-CD-2026-001` (demande 63, 24 €, émise le 06/09) prouve que l'interrupteur est sur `on` en prod : `requestCommission` rend `disabled` sinon, et aucun autre chemin n'émet.
- Les seuls cas où une demande acceptée reste **durablement** sans `outcome` sont ceux que le cron écarte chaque nuit : `date_from < 2026-08-05`, fiche légale du loueur incomplète (`partnerBillingIdentity`), loueur sans taux, commission sous 0,50 €, `booking_paid_at` non nul. Ces rejets sont déjà annoncés **tous les jours** sur Telegram par le bloc `notifyOps` du cron (`Commission voiture : N ligne(s) NON facturée(s)`), avec le motif.

Les vrais trous, que cette spec ferme :

1. **Personne ne confirme l'issue après `date_to`.** Le cron *présume* « louée » au J1 (assumé dans la spec du 31/07). L'email de facture dit « If this rental did not take place, reply to this email » : la correction repose sur une réponse libre du loueur, lue par un humain, suivie d'un clic « avoir » manuel. Rien n'interroge le loueur quand il ne répond pas.
2. **Une demande écartée par le cron n'a aucune seconde chance automatique.** Elle repasse chaque nuit dans le lot tant que `date_from >= START`, mais si le blocage vient de la fiche loueur, elle n'est facturée que le jour où quelqu'un la complète, et rien ne demande au loueur si la location a eu lieu. Sous `START`, elle n'est jamais reprise.
3. **Aucune relance de facture impayée.** Explicitement hors périmètre le 31/07. `001` est « payment due on receipt » (`src/app/[locale]/invoice/[token]/page.tsx`, ligne « Issued … · payment due on receipt ») et rien ne se passe si elle reste due.

Le chiffre « 128 € jamais facturés » est donc à relire : ce sont **128 € qui seront facturés au J1 si les fiches loueur sont complètes**, et **0 € sinon, en silence structurel** (le Telegram le dira, mais rien ne débloque). Le test le moins cher est demain : le 08/09 après 05:00 UTC, la demande 33 doit porter `NOVAI-CD-2026-002`. Sinon, la ligne Telegram du matin nomme le motif.

## 1. Objectif et non-objectifs

**Objectif.** Qu'aucune demande acceptée ne reste sans issue connue au-delà de dix jours après la fin de location, que l'issue vienne du loueur (un clic), de l'admin, ou de la présomption du cron ; que la commission soit facturée dans les 48 h qui suivent une issue « louée » ; qu'une issue « pas eu lieu » annule la facture par avoir sans réponse libre à lire ; qu'une facture due soit relancée à J+15 et remontée à J+30.

**Non-objectifs.**
- Régularisation d'écart entre `quoted_price` et le montant réellement encaissé par le loueur (déjà hors périmètre le 31/07, jamais rencontré).
- Locations payées en ligne via le tunnel voyageur (`booking_paid_at` non nul) : la commission y est déduite en amont, même exclusion que le cron de facturation.
- Remboursement Stripe automatique sur avoir d'une facture déjà payée (reste manuel, trop rare).
- Vérification auprès du voyageur qu'une location déclarée « pas eu lieu » n'a vraiment pas eu lieu (voir 8, risque de fraude, accepté et mesuré avant d'être outillé).
- PDF de facture, relance par WhatsApp automatique (l'admin garde le lien `waHref` de `src/lib/car-admin.ts`).
- Verticales activités et van.

## 2. Cron `car-outcome-followup`

### 2.1 Nouvelle route, pas une extension

Candidats à l'extension, lus et écartés :

- `src/app/api/cron/car-relance/route.ts` : passe loueur (déléguée à `runPartnerNudgePass`) et passe client, toutes deux **avant acceptation** (`status = 'quoted'`), avec une garde `startInFuture` qui est l'inverse exact de la nôtre (`date_to` passée). Y greffer une troisième passe post-location mêlerait deux cycles de vie dans une réponse JSON unique et un seul 200.
- `src/app/api/cron/car-commission-invoice/route.ts` : tourne au J1, son filtre d'idempotence est `outcome IS NULL` et il **écrit** `outcome`. Lui faire aussi relire des lignes `outcome = 'rented'` casserait le contrat documenté en tête de sa boucle.

Une route de plus coûte trois lignes (`assertCron`, appel du module, JSON), le pattern du dépôt est déjà « route mince + module serveur + logique pure » (`car-partner-nudge/route.ts` → `car-partner-nudge-server.ts` → `car-quotes.ts`). On le reproduit :

| Fichier | Rôle |
|---|---|
| `src/app/api/cron/car-outcome-followup/route.ts` | `assertCron(request)` en première ligne (`src/lib/cron-auth.ts`), puis `runOutcomeFollowupPass(now)` et `runInvoiceReminderPass(now)` (section 6), rend les compteurs |
| `src/lib/car-outcome-followup-server.ts` | Lectures/écritures Supabase, envoi des emails, `notifyOps` |
| `src/lib/car-outcome-followup.ts` | **Pur, zéro I/O** : `outcomeFollowupStep()`, `outcomeClickDecision()`, sujets et corps d'email, libellés admin. Testable sans base, node-safe pour un futur `scripts/check-car-outcome.mjs` |
| `src/lib/car-outcome-server.ts` | `applyOutcome()` : l'écriture d'issue **partagée** par l'admin, l'endpoint et le cron (section 3.3) |

### 2.2 Horaire

`vercel.json` porte 13 crons. Occupés : `:00` de chaque heure (`car-no-quote`), `:30` (`activity-no-quote`), `:40` (`car-partner-nudge`), 03:00, 04:40 lun, 04:50, 05:00, 05:00 lun, 05:10, 09:00, 09:10, 09:20, 09:30.

Retenu : **`20 6 * * *`** (06:20 UTC, 09:20 Athènes). Après le cron de facturation de 05:00, donc une ligne facturée au J1 le matin même ne reçoit pas de question d'issue le même jour ; heure ouvrable côté loueur pour un email qu'on veut lu ; même jour civil UTC et Athènes, donc `date_to < aujourd'hui` est sans ambiguïté. La date du jour est `todayAthens()` de `src/lib/car-partner-identity.ts` (déjà exportée, déjà utilisée par les actions admin).

14e entrée : `{ "path": "/api/cron/car-outcome-followup", "schedule": "20 6 * * *" }`.

### 2.3 Sélection

Deux populations, une seule question au loueur :

**A. Issue inconnue.** `status = 'accepted'`, `outcome IS NULL`, `booking_paid_at IS NULL`, `quoted_by_partner_id IS NOT NULL`, `date_to < today`. Ce sont les lignes que le cron de facturation a écartées ou n'a jamais vues (sous `START`).

**B. Issue présumée, non confirmée.** `outcome = 'rented'`, **`outcome_source = 'auto'`**, `date_to < today`. Ce sont les lignes basculées par le cron au J1 : facturées, jamais confirmées.

Exclusions communes : `status = 'cancelled'` (sortie du flux par l'admin, `cancelRequest` dans `src/app/admin/car-rental/actions.ts`), loueur sans email (→ notification ops immédiate, motif `partner_without_email`, pas d'attente J+10).

### 2.4 Calendrier, fonction pure

`outcomeFollowupStep(row, today, nowMs)` rend `none | send | escalate` à partir de `date_to`, `outcome_followup_count`, `outcome_followup_sent_at`, `outcome_followup_escalated_at` :

| Étape | Condition | Effet |
|---|---|---|
| Email 1 | `date_to < today` et `count = 0` | envoi, `count = 1`, `sent_at = now` |
| Email 2 (J+4) | `count = 1` et `sent_at + 3 j <= now` | envoi, `count = 2` |
| Email 3 (J+8) | `count = 2` et `sent_at + 4 j <= now` | envoi, `count = 3` |
| Escalade (J+10) | `count = 3` et `date_to + 10 j <= today` | `notifyOps` non silencieux, `escalated_at = now` si nul |
| Rappel | `escalated_at` non nul, issue toujours inconnue ou non confirmée | `notifyOps` **chaque passage**, même doctrine que le cron de facturation : la ligne se tait dès qu'un clic pose l'issue, la sortie du bruit est évidente |

Compteur et horodatage sont écrits **avant** l'envoi, comme `relanced_at` dans `runPartnerNudgePass` : un email refusé par Resend n'est pas renvoyé le lendemain, il le sera à l'étape suivante, et un double envoi le même jour est impossible. `sendPartnerOutcomeQuestion` lit `res.error` via `reportSend` (`src/lib/resend-response.ts`), jamais un `await` nu.

Le jour de mise en service, la première passe rattrape d'un coup toutes les lignes A et B dont `date_to` est passée (`date_to < today`, pas `=`), y compris la 63 si sa location est finie. C'est voulu : c'est le rattrapage de la section 5.

### 2.5 Notification ops à J+10

Via `notifyOps` de `src/lib/ops-notify.ts`, dans le format du cron de facturation :

- `title` : `Issue de location inconnue à J+10 : N demande(s)`
- `lines` : `#33 Zorbas · 08/09 → 15/09 · 320 € · 3 emails sans réponse` (une par demande, loueur nommé, comme `ligneEcartee`)
- `action` : `Poser l'issue dans le back-office (Loué / Perdu) ou appeler le loueur, lien WhatsApp ci-dessous.` Le lien vient de `waHref(partner.whatsapp, message)` de `src/lib/car-admin.ts` quand `whatsapp` est renseigné.
- `due` : `echeance(2)` (helper existant du même fichier)
- `url` : `${siteBase()}/admin/car-rental`

## 3. Lien signé, page et endpoint

### 3.1 Mécanisme de jeton : réutiliser, ne pas inventer

Le dépôt a déjà deux conventions dans `src/lib/car-quote.ts` : `newToken()` (UUID) et `hashToken()` (SHA-256, seul le hash vit en base). Et deux stratégies :

- **rotatif** : `car_quote_invites.quote_token_hash` régénéré à chaque relance (`runPartnerNudgePass`), `car_commission_invoices.token_hash` régénéré à chaque renvoi (`rotateInvoiceToken`). Coût : chaque ancien email meurt en 404.
- **stable** : `car_requests.client_token` en clair, décidé le 12/07 (`supabase/migrations/20260712_car_client_token.sql`) précisément parce que la rotation faisait tomber les liens des emails précédents.

Ici le loueur recevra jusqu'à trois emails à trois jours d'intervalle et cliquera sur n'importe lequel : **stable**, colonne `car_requests.outcome_token` en clair, générée au premier envoi par `resolveClientToken`-like (`existing ? existing : newToken()`), même arbitrage que `client_token`. Lookup par égalité sur `outcome_token`. Un jeton inconnu rend 404.

### 3.2 Pourquoi un GET ne doit rien écrire

Les deux liens de l'email pointent vers une **page**, pas vers l'endpoint : `/en/rental-outcome/{token}?choice=rented` et `/en/rental-outcome/{token}?choice=lost`. Les scanners de liens (Outlook Safe Links, passerelles antispam, aperçus Gmail) suivent les URL d'un email par GET avant que le loueur ne les voie. Un GET qui pose une issue ferait poser des issues par des robots, dans les deux sens. Le pattern existe déjà dans le dépôt : `src/app/[locale]/car-offer/[token]/page.tsx` affiche, `AcceptButton.tsx` poste vers `src/app/api/car-rental/accept/route.ts`.

La page, sous `/en` comme `car-quote` et `invoice` (les loueurs sont servis en anglais, un seul canal, une seule langue), `noindex` comme la page facture, montre la location (dates, modèle, prix accepté, voyageur), le choix pré-sélectionné par `?choice=`, et **un seul bouton** de confirmation qui poste `token` + `choice` vers `POST /api/car-rental/outcome`. Pas de JavaScript requis : un `<form method="post">` et une redirection 303 vers la même page avec `?done=1`, comme `commission/checkout/route.ts`.

### 3.3 Écriture partagée : `applyOutcome`

Trois écrivains d'issue existent ou vont exister : `setOutcome` (admin, `src/app/admin/car-rental/actions.ts`), la bascule inline du cron de facturation, et l'endpoint. `setOutcome` porte aujourd'hui la logique (snapshot `commission_eur` au taux du jour via `commissionEur`, `commission_paid_at = null` sur `lost`, appel de `requestCommission` sur `rented`, `expireCommissionSession` sur `lost`). On l'extrait dans `src/lib/car-outcome-server.ts` :

```
applyOutcome({ id, outcome, source, finalAmountEur }) → CommissionOutcome | { status: "lost" }
```

- `source ∈ { 'partner_link', 'admin', 'auto' }`, écrit dans `outcome_source`.
- `setOutcome` devient un appel à `applyOutcome(..., source: 'admin')` plus ses redirections d'écran, comportement inchangé (ses tests `actions.test.ts` restent verts).
- Le cron de facturation **n'est pas réécrit** : il ajoute `outcome_source: 'auto'` à son `update` existant. Un diff d'une ligne, dans une route dont les tests verrouillent l'ordre d'écriture.

### 3.4 Décision au clic, fonction pure

`outcomeClickDecision(row, choice)` dans `car-outcome-followup.ts`, avec `row = { status, outcome, outcome_source, hasInvoice, invoicePaid, invoiceCredited }` :

| État de la demande | Clic « a eu lieu » | Clic « n'a pas eu lieu » |
|---|---|---|
| `outcome IS NULL` | `applyOutcome(rented, partner_link, quoted_price)` → `requestCommission` part dans la foulée, la facture suit en minutes | `applyOutcome(lost, partner_link)` |
| `rented` / `auto` (présumée, facturée) | `outcome_source = 'partner_link'`, `outcome_at = now` : la présomption devient un fait, rien d'autre ne bouge | `creditCommissionInvoice(id, reason)` de `src/lib/car-invoice-credit.ts` : expire la session Stripe, avoir `NNN-A`, `outcome = 'lost'`, email d'avoir ; puis `outcome_source = 'partner_link'`. Notification ops **non silencieuse** |
| `rented` / `auto`, facture **déjà payée** | idem confirmation | aucune écriture, page « already paid, reply to hello@crete.direct » et notification ops : le remboursement est manuel (décision du 31/07) |
| `rented` ou `lost` posé par `admin` ou `partner_link` | aucune écriture, page « recorded on {date} » | idem ; si le clic contredit l'issue posée, notification ops « contestation » |
| `status = 'cancelled'` | aucune écriture, page « this request was cancelled » | idem |
| jeton inconnu | 404 | 404 |

**Décision assumée : l'avoir est automatique sur le clic « n'a pas eu lieu ».** La doctrine du back-office (« émettre une pièce comptable est une décision, pas un effet de bord d'un clic de statut », commentaire de `setOutcome`) visait le bouton « Perdu » de l'admin, ambigu sur sa cause. Ici la cause est la déclaration explicite du débiteur lui-même, l'email de facture lui a promis l'annulation dans ce cas, et laisser une facture « due » sur une location que le loueur dit non advenue ferait mentir la page facture. `creditCommissionInvoice` fait déjà tout dans le bon ordre (session expirée **avant** l'avoir), on ne réécrit rien. Le motif enregistré : `Reported by the rental company via the outcome link on 2026-09-16`. Le prix de cette décision est en section 8 (fraude).

### 3.5 Email au loueur

Nouveaux `outcomeQuestionSubject()` et `outcomeQuestionBody()` dans `car-outcome-followup.ts`, envoi `sendPartnerOutcomeQuestion()` dans `src/lib/email.ts` (`from: FROM_EMAIL`, `replyTo: "hello@crete.direct"`, texte brut, comme `sendPartnerCommissionRequest`). Anglais, style des emails loueur existants :

```
Subject: crete.direct · did rental 33 take place? One click

Hi Nikos,

Rental 33 · 08/09 to 15/09 · Heraklion airport · Toyota Yaris automatic
Traveller: Marie D. · Price accepted: 320.00 EUR

Did this rental take place?

  Yes, it took place:      https://crete.direct/en/rental-outcome/{token}?choice=rented
  No, it did not happen:   https://crete.direct/en/rental-outcome/{token}?choice=lost

[population B uniquement]
Invoice NOVAI-CD-2026-002 (32.00 EUR) was issued on the first day of the rental.
If it did not take place, the second link cancels it by credit note, nothing to pay.

[population A uniquement]
If it took place, the 10% commission invoice (32.00 EUR) follows automatically.

Kami
crete.direct
```

Emails 2 et 3 : même corps, sujet préfixé `Reminder:` puis `Last reminder:`, et une ligne « Without an answer by {date_to + 10 j} we will call you. » sur le troisième.

## 4. Back-office

Le bouton demandé **existe déjà** : `src/app/admin/car-rental/requests-table.tsx` lignes 467 à 501, formulaires « Loué » (avec montant) et « Perdu » liés à `setOutcome`, sur toute demande sans issue, et repliés sous « corriger l'issue » quand une issue est posée. On ne le duplique pas. Trois retouches :

1. `setOutcome` passe par `applyOutcome(source: 'admin')` (3.3).
2. `outcomeBadge()` (ligne 117) affiche la source : `louée · présumée J1`, `louée · confirmée loueur`, `louée · admin`, `perdue · loueur`, etc. Une issue présumée et une issue confirmée ne se lisent plus pareil.
3. Sous le badge, une ligne d'état de relance quand elle existe : `question d'issue : 2/3 envoyées, dernière le 12/09` ou `escaladée le 18/09`. Données déjà chargées par `select("*")` dans `page.tsx`, aucune requête de plus. Rien d'autre : pas de bouton « renvoyer la question », le cron le fait ; pas de nouveau filtre, la notification ops porte le lien.

## 5. Rattrapage des quatre demandes

Depuis ce worktree, la base de prod n'est pas lisible : `SUPABASE_SERVICE_KEY` n'existe que sur Vercel (commentaire de `src/lib/supabase-admin.ts`) et l'accès SSH au VPS a été refusé par le bac à sable de cette session. Les dates ci-dessous viennent du contexte fourni, la décision est une règle à appliquer après **une** requête :

```sql
select r.id, r.status, r.date_from, r.date_to, r.quoted_price, r.quoted_by_partner_id,
       r.outcome, r.booking_paid_at, p.name, p.vat_id, p.legal_name, p.address_line,
       p.postal_code, p.city, p.country, i.number
from car_requests r
join car_partners p on p.id = r.quoted_by_partner_id
left join car_commission_invoices i on i.request_id = r.id
where r.id in (25, 33, 48, 62, 63);
```

| Cas | Ce que le cron actuel fait | Action |
|---|---|---|
| `date_from > 07/09` (33 à partir du 08/09, vraisemblablement 48 et 62) | facture au J1 à 05:00 UTC, **si** `partnerBillingIdentity` est complète | **Aucune écriture.** Vérifier la fiche légale des loueurs concernés dans l'onglet Partenaires **avant** le 08/09 pour la 33 : les six champs de `REQUIRED_BILLING_FIELDS` (`src/lib/car-invoice.ts`). Au 01/08, un seul loueur sur dix était complet (commentaire de `updatePartnerIdentity`). Une fiche incomplète = ligne « NON facturée » chaque matin sur Telegram, jusqu'à complétion, sans perte : le `<=` du cron rattrape |
| `05/08 <= date_from <= 07/09` sans facture | la ligne repasse chaque nuit, écartée pour un motif nommé sur Telegram | Lire le motif dans le fil ops, corriger la fiche (ou le taux), le cron facture la nuit suivante. Rien à poser à la main |
| `date_from < 05/08` (hypothèse pour la 25, « démarrée ? ») [HYP] | jamais reprise, sous `COMMISSION_INVOICING_START` | Si `date_to` est passée : bouton « Loué » avec le montant dans l'admin (`setOutcome` → `requestCommission` émet la facture) ou « Perdu ». Si la location est encore à venir : ne rien faire, le nouveau cron posera la question au loueur à J+1 |
| toute ligne, après mise en service | le nouveau cron interroge le loueur à `date_to + 1` | premier passage : rattrapage groupé de tout ce dont `date_to` est passée |

Rétro-remplissage de `outcome_source` pour les 6 issues existantes (2 `rented`, 4 `lost`) dans la migration : `'admin'` partout, sauf la 63 si sa facture est née du cron (à vérifier avec `outcome_at` égal à la minute près à `issued_at` de `001` : alors `'auto'`, et elle recevra la question de confirmation à J+1, ce qui en fait le premier test réel du circuit) [HYP].

## 6. Facture `NOVAI-CD-2026-001` et rappel automatique

**État** : demande 63, 24 €, émise et envoyée le 06/09, échéance « on receipt ». Un jour d'âge le 07/09 : **aucune relance aujourd'hui**, relancer une facture de la veille abîme la relation pour rien.

**Règle** (deuxième passe du même cron, `runInvoiceReminderPass`) :

| Étape | Sélection | Effet |
|---|---|---|
| J+15 | `sent_at IS NOT NULL AND paid_at IS NULL AND credited_at IS NULL AND sent_at + 15 j <= now AND reminded_at IS NULL` | `rotateInvoiceToken()` (le clair n'est pas relisible, `src/lib/car-invoice-server.ts`), `reminded_at = now` **avant** l'envoi, email `sendInvoiceReminder()` |
| J+30 | idem avec `sent_at + 30 j <= now` | `notifyOps` non silencieux chaque passage : `Facture NOVAI-CD-2026-001 due depuis 30 j · Zorbas · 24 €`, `action` : « appeler ou WhatsApp », lien `waHref`, `due: echeance(3)` |

⛔ `sent_at IS NULL` n'entre jamais dans cette passe : une facture numérotée jamais partie est l'état `alert` de `invoiceAdminState`, rattrapé par « Renvoyer » dans l'admin, pas par une relance.

⛔ On ne réutilise pas `resendCommissionInvoice` pour la relance : son texte dit « starts today ». Nouveau `invoiceReminderBody()` dans `src/lib/car-commission.ts`, à côté de `commissionRequestBody` :

```
Subject: Reminder · crete.direct invoice NOVAI-CD-2026-001 (24.00 EUR)

Hi Nikos,

Invoice NOVAI-CD-2026-001 for rental 63 (06/09 to 13/09) was issued on 2026-09-06 and is still open.
Amount: 24.00 EUR, payable on receipt.

View and pay the invoice here (card or bank transfer, IBAN on the page):
{invoiceUrl}

If you already paid by transfer, thank you, please ignore this message.
If the rental did not take place, tell us here and the invoice will be cancelled:
{outcomeUrl}?choice=lost

Kami
crete.direct
```

Le second lien réutilise le jeton d'issue de la section 3 : une facture contestée à J+15 passe par le même circuit qu'une issue déclarée à J+1.

**Pour la 001 précisément** : si le chantier est en prod avant le 21/09, le cron la relance tout seul ce jour-là ; sinon, le premier passage la rattrape (`sent_at + 15 j <= now`, pas `=`). Aucune action manuelle prévue. Canal : email, le seul que les loueurs reçoivent de nous ; le téléphone reste au J+30, humain.

## 7. Données et migration

`supabase/migrations/20260908_car_outcome_followup.sql`, conventions du dépôt (`alter … add column if not exists`, commentaire de tête qui explique le pourquoi, `notify pgrst, 'reload schema'` en fin). Les colonnes héritent des grants table-level déjà posés (`service_role` a `select, insert, update` sur les deux tables), rien à regranter.

```sql
alter table public.car_requests
  -- qui a posé l'issue : 'auto' = présomption du cron au J1, 'partner_link' = clic
  -- du loueur, 'admin' = back-office. Sans elle, présumé et confirmé se lisent pareil.
  add column if not exists outcome_source text
    check (outcome_source in ('partner_link', 'admin', 'auto')),
  -- jeton STABLE en clair, même arbitrage que client_token (20260712) : trois
  -- emails, un seul lien vivant.
  add column if not exists outcome_token text unique,
  add column if not exists outcome_followup_count smallint not null default 0,
  add column if not exists outcome_followup_sent_at timestamptz,
  add column if not exists outcome_followup_escalated_at timestamptz;

alter table public.car_commission_invoices
  add column if not exists reminded_at timestamptz;

update public.car_requests set outcome_source = 'admin'
  where outcome is not null and outcome_source is null;
-- 63 : 'auto' si la facture 001 est née du cron (voir section 5), à trancher avant d'appliquer.
```

Pas d'index : `car_requests` compte moins d'un millier de lignes (`limit(1000)` de la page admin) et les deux passes lisent une fois par jour.

`src/lib/car-admin.ts` : `AdminRequest` gagne `outcome_source?`, `outcome_followup_count?`, `outcome_followup_sent_at?`, `outcome_followup_escalated_at?`, optionnels comme les colonnes de la migration `20260705_car_admin.sql` (tolérance d'une prod pas encore migrée). `OUTCOME_SOURCES` exporté à côté de `OUTCOMES`.

## 8. Erreurs, idempotence, cas limites

| Cas | Comportement |
|---|---|
| Double clic, même choix | Deuxième POST : `outcomeClickDecision` voit `outcome_source = 'partner_link'` et le même outcome → aucune écriture, page « recorded on {date} ». Sur `lost`, `creditCommissionInvoice` rendrait de toute façon `already_credited` |
| Deux clics contradictoires | Le premier gagne. Le second n'écrit rien, page « already recorded, reply to hello@crete.direct if this is wrong », notification ops « contestation ». L'update du premier est conditionnel (`.is("outcome", null)` ou `.eq("outcome_source", "auto")` avec `.select()`, et zéro ligne touchée = perdu la course), même verrou optimiste que `commission_requested_at` |
| Deux POST simultanés « a eu lieu » sur issue nulle | Un seul remporte l'update conditionnel ; `requestCommission` a son propre verrou et `car_commission_invoices.request_id` est `UNIQUE` : une seule facture, structurellement |
| Lien « expiré » | Pas d'expiration par le temps : le pouvoir du lien s'éteint quand l'issue est connue d'une source non `auto`, et la page le dit. Un jeton inconnu rend 404. Ajouter une date limite serait une colonne et un test pour un cas que rien ne motive |
| Demande annulée entre l'email et le clic | `status = 'cancelled'` : aucune écriture, page dédiée. Note : `canCancelRequest` (`src/lib/car-quotes.ts`) refuse déjà d'annuler une `accepted`, le cas ne peut venir que d'un SQL manuel |
| Issue posée par l'admin entre l'email et le clic | Aucune écriture (ligne 4 du tableau 3.4), page « recorded » |
| Resend refuse l'email de question | Compteur déjà incrémenté, `reportSend` journalise, l'étape suivante réessaie (J+4, J+8). Trois tentatives par construction |
| Loueur sans email | Sort des populations A/B, notification ops immédiate avec motif, la ligne y reste chaque jour jusqu'à saisie admin |
| `requestCommission` refuse après un clic « a eu lieu » (`partner_identity_incomplete`, `failed`) | L'issue **est** posée (`rented`, `partner_link`), comme dans `setOutcome`. La demande entre dans le cas déjà géré par `commissionCatchUp` (`src/lib/car-commission-catchup.ts`) : bouton « Émettre la facture » ou lien vers la fiche à compléter dans l'admin. Notification ops avec le code réel |
| Clic « n'a pas eu lieu » sur facture payée | Aucun avoir (`creditCommissionInvoice` rend `already_paid`), notification ops : remboursement manuel |
| Telegram indisponible | `notifyOps` ne lève jamais, la passe continue, comme partout |
| Fraude : loueur qui clique « n'a pas eu lieu » pour éviter 32 € [HYP, jamais observé] | Accepté à ce stade : l'avoir part, la notification ops **non silencieuse** nomme le loueur, le voyageur est joignable (`customer_email`, `customer_phone`). Mesure : nombre de `lost` de source `partner_link` par loueur, lisible dans l'admin. Déclencheur d'upgrade : un loueur à 2 `lost` déclarés sur 5 locations → question au voyageur avant avoir. Pas avant |

Interaction avec le contrat du cron de facturation : **aucun chemin de cette spec ne remet `outcome` à `NULL`**, la note en tête de sa boucle reste vraie.

## 9. Tests à écrire

Vitest (`npm test`), mocks `@/lib/supabase-admin` selon le câblage de `src/app/api/cron/car-commission-invoice/route.test.ts`.

- `src/lib/car-outcome-followup.test.ts` (pur) : `outcomeFollowupStep` sur les 5 étapes, `date_to = today` ne déclenche rien, `date_to < today` déclenche ; bornes J+4 et J+8 à la seconde près ; `outcomeClickDecision` sur les 12 cases du tableau 3.4 ; sujets et corps des trois emails (présence des deux liens, ligne facture uniquement en population B, aucun tiret cadratin dans le texte, même assertion que `scripts/check-campagne.mjs`).
- `src/lib/car-outcome-server.test.ts` : `applyOutcome` écrit `outcome_source` ; `rented` appelle `requestCommission` **après** l'update ; `lost` remet `commission_paid_at` à `null` et appelle `expireCommissionSession` ; parité stricte avec les tests existants de `setOutcome` dans `src/app/admin/car-rental/actions.test.ts` (qui doivent rester verts sans modification de leurs assertions).
- `src/lib/car-outcome-followup-server.test.ts` : compteur écrit **avant** l'envoi ; Resend refusé n'empêche pas l'incrément ; population A et B sélectionnées, `cancelled` et `booking_paid_at` exclus ; loueur sans email → `notifyOps` immédiat ; J+10 → `notifyOps` avec `due`, `url`, loueur nommé, non silencieux ; passage suivant → nouvelle notification tant que non résolu.
- `src/app/api/cron/car-outcome-followup/route.test.ts` : 503 sans `CRON_SECRET`, 403 mauvais secret (contrat de `assertCron`), les deux passes appelées, réponse JSON avec compteurs.
- `src/app/api/car-rental/outcome/route.test.ts` : 400 sans jeton, 404 jeton inconnu, 303 vers la page après écriture, aucune écriture sur `cancelled`, course perdue (update à zéro ligne) → aucune facturation.
- `src/app/[locale]/rental-outcome/[token]/page.test.ts` : `noindex`, choix pré-sélectionné par `?choice=`, états « recorded », « cancelled », « done ».
- `src/lib/car-invoice-reminder.test.ts` (ou dans `car-outcome-followup-server.test.ts`) : sélection J+15 et J+30, `sent_at IS NULL` jamais relancée, `paid_at` et `credited_at` excluent, `reminded_at` écrit avant l'envoi, jeton tourné avant l'email, refus de `rotateInvoiceToken` → aucun email.
- `src/lib/car-commission.test.ts` : ajout `invoiceReminderBody` (numéro, montant, deux liens, pas « starts today »).
- `src/app/api/cron/car-commission-invoice/route.test.ts` : un `it` de plus, la bascule écrit `outcome_source: 'auto'`.
- `src/lib/car-invoice-credit.test.ts` : `creditCommissionInvoice` accepte et écrit la `source` optionnelle, défaut `'admin'` inchangé.
- `scripts/check-car-admin.mjs` : `OUTCOME_SOURCES` exporté et libellés de badge pour chaque source.

## 10. Mesure de succès

Deux requêtes, à poser dans le fil ops à la main après deux semaines, puis en ligne dans le Telegram hebdomadaire si elles servent :

```sql
-- 0 attendu : issue inconnue ou seulement présumée au-delà de J+10
select count(*) from car_requests
where status = 'accepted' and booking_paid_at is null
  and date_to + 10 < current_date
  and (outcome is null or outcome_source = 'auto');

-- 0 attendu : louée sans facture dans les 48 h (hors tunnel voyageur)
select r.id from car_requests r
left join car_commission_invoices i on i.request_id = r.id
where r.outcome = 'rented' and r.booking_paid_at is null
  and r.outcome_at < now() - interval '48 hours'
  and (i.id is null or i.issued_at > r.outcome_at + interval '48 hours');

-- suivi : factures dues depuis plus de 30 j
select number, amount_eur, sent_at from car_commission_invoices
where paid_at is null and credited_at is null and sent_at < now() - interval '30 days';
```

Seuils : première requête à 0 en permanence à partir de J+10 après mise en service ; deuxième à 0 sauf lignes bloquées par une fiche loueur incomplète, qui apparaissent déjà nommées chaque matin ; part des issues de source `partner_link` sur les issues posées, cible > 60 % à 30 jours (sinon l'email n'est pas lu et il faut regarder l'objet, pas le calendrier).

## 11. Effort et ordre

| # | Tâche | h |
|---|---|---|
| 1 | Migration `20260908_car_outcome_followup.sql`, types `AdminRequest`, `OUTCOME_SOURCES`, rétro-remplissage tranché | 0,5 |
| 2 | `car-outcome-server.ts` : extraction de `applyOutcome` depuis `setOutcome`, `source`, tests verts inchangés côté admin ; `outcome_source: 'auto'` dans le cron de facturation ; `source` optionnelle dans `creditCommissionInvoice` | 2 |
| 3 | `car-outcome-followup.ts` pur : `outcomeFollowupStep`, `outcomeClickDecision`, textes des 3 emails, libellés de badge + tests | 2,5 |
| 4 | Endpoint `POST /api/car-rental/outcome` + page `/en/rental-outcome/[token]` + `sendPartnerOutcomeQuestion` dans `email.ts` + tests | 3 |
| 5 | `car-outcome-followup-server.ts` : passe issue (A/B, calendrier, ops J+10) + route cron + `vercel.json` + tests | 2,5 |
| 6 | Passe relance facture (`reminded_at`, `invoiceReminderBody`, `sendInvoiceReminder`, ops J+30) + tests | 1,5 |
| 7 | Admin : badge de source, ligne d'état de relance | 0,5 |
| 8 | Mockup HTML de la page loueur et du badge admin avant push (règle du dépôt), `npm run check`, `npm run ship` | 1 |
| 9 | Jour J : requête SQL de la section 5, vérifier la fiche du loueur de la 33 avant le 08/09, appliquer la migration, poser l'issue de la 25 si sous `START` | 0,5 |
| | **Total** | **14** |

Ordre : 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. La tâche 9, ligne « fiche du loueur de la 33 », se fait **avant tout le reste et avant le 08/09** : elle ne dépend d'aucun code et c'est elle qui décide si 32 € partent demain matin.

## Fichiers lus

- `docs/superpowers/specs/2026-07-31-car-commission-invoice-design.md`
- `vercel.json`
- `CLAUDE.md` (dépôt)
- `src/app/api/cron/car-commission-invoice/route.ts` et `route.test.ts`
- `src/app/api/cron/car-relance/route.ts`
- `src/app/api/cron/car-partner-nudge/route.ts`
- `src/app/api/car-rental/accept/route.ts`
- `src/app/api/car-rental/commission/checkout/route.ts`
- `src/app/api/car-rental/commission/webhook/route.ts` (extraits : `markInvoicePaid`, `scope: "car"`)
- `src/app/[locale]/invoice/[token]/page.tsx` (en-tête, états, mention d'échéance)
- `src/app/admin/car-rental/actions.ts`, `actions.test.ts` (liste des `describe`/`it`)
- `src/app/admin/car-rental/requests-table.tsx` (lignes 117, 257 à 275, 347 à 373, 460 à 520)
- `src/app/admin/car-rental/page.tsx` (requêtes, lignes 52 à 82)
- `src/lib/car-admin.ts`
- `src/lib/car-commission.ts`
- `src/lib/car-commission-server.ts`
- `src/lib/car-commission-catchup.ts`
- `src/lib/car-invoice.ts`
- `src/lib/car-invoice-server.ts`
- `src/lib/car-invoice-credit.ts`
- `src/lib/car-quote.ts`
- `src/lib/car-quotes.ts` (extraits : `canCancelRequest`, seuils de relance)
- `src/lib/car-partner-nudge-server.ts`
- `src/lib/car-partners-db.ts`
- `src/lib/car-partner-identity.ts` (`todayAthens`)
- `src/lib/athens-time.ts`
- `src/lib/cron-auth.ts`
- `src/lib/ops-notify.ts`
- `src/lib/resend-response.ts`
- `src/lib/supabase-admin.ts` (en-tête)
- `src/lib/email.ts` (index des fonctions, `sendPartnerRelance`, `sendPartnerCommissionRequest`, `sendCreditNote`, constantes `FROM_EMAIL`)
- `supabase/migrations/20260612_car_requests.sql`
- `supabase/migrations/20260705_car_admin.sql`
- `supabase/migrations/20260712_car_client_token.sql`
- `supabase/migrations/20260729_car_commission_stripe.sql`
- `supabase/migrations/20260801_car_commission_invoices.sql`
- `scripts/check-car-commission.mjs` (en-tête), `scripts/check-campagne.mjs` (règle tiret cadratin)
- `package.json` (scripts `test`, `check`, `ship`)
