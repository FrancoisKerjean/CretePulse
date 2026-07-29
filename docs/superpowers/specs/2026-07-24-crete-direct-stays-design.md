# crete.direct « Stays » — Location saisonnière directe

**Date :** 2026-07-24
**Statut :** Design validé, prêt pour plan d'implémentation
**Repo :** `cp-multiquote` (crete.direct)

## 1. Objectif

Ajouter à crete.direct une marketplace de location saisonnière type Airbnb-lite.
Un proprio colle son lien Airbnb pour créer son annonce en quelques secondes ; un
voyageur fait une demande de dates ; le proprio accepte ou refuse en fixant son
prix ; le paiement est encaissé par crete.direct via Stripe Connect avec une
commission de 5 %.

Le logement n'est pas un centre de profit — c'est un aimant à trafic et à data
pour crete.direct (renforce le positionnement « vivez la Crète en direct »,
compense l'effondrement Google du 19/07). La commission couvre les frais et rend
l'opération viable sans la rendre chère.

## 2. Proposition de valeur

Airbnb prélève ~15-18 % de friction totale sur une transaction (frais guest ~14 %
+ frais host ~3 %). crete.direct n'en prend que 5 %, ce qui laisse ~12 % de marge à
redistribuer. Le proprio ET le voyageur y gagnent en même temps :

| | Airbnb (nuit à 100 €) | crete.direct 5 % |
|---|---|---|
| Le voyageur paie | ~114 € | **105 €** |
| Le proprio reçoit | ~97 € | **100 €** |
| La plateforme garde | ~17 € | 5 € (dont ~3 € Stripe) |

Sur un séjour de 7 nuits à 100 € : le voyageur économise ~63 €, le proprio gagne
+21 €. Positionnement de marque : « Louez en direct. Sans le racket Airbnb. »

## 3. Décisions verrouillées

Toutes tranchées en brainstorming avec Kami :

1. **Onboarding** : le proprio colle son lien Airbnb, import automatique best-effort.
2. **Revenus** : commission 5 %, affichée côté voyageur comme « frais de paiement »
   (pas « commission »). Le prix affiché = le prix net du proprio ; les 5 % sont
   ajoutés au voyageur. Pas de version gratuite (à 0 %, Stripe ~3 % serait à perte).
3. **Paiement** : crete.direct encaisse via Stripe Connect (destination charge),
   setup KYC juste-à-temps (le proprio ne fait son onboarding Stripe qu'à sa 1ʳᵉ
   demande acceptée).
4. **Prix** : fixé par le proprio à l'acceptation de chaque demande (il confirme ou
   ajuste). Un prix indicatif importé d'Airbnb est affiché en amont.
5. **Dégâts / assurance** : aucune caution gérée par crete.direct au lancement.
   CGU « intermédiaire technique » : ni hébergeur ni assureur, hors litige.
   Empreinte CB optionnelle repoussée en phase 2.
6. **Vérification propriété** : double filtre naturel, zéro modération humaine —
   annonce `draft` au collage → `published` seulement après fourniture de l'iCal
   privé Airbnb (preuve de contrôle + sync dispos) → **réservable** seulement après
   KYC Stripe.
7. **Architecture** : cloner le moteur de réservation Kairos (siteweb) dans
   crete.direct. Rejeté : déléguer à une API Kairos cross-domaine (moteur hardcodé
   `kairosguest.com`, friction de paiement inter-domaines) ; MVP mise-en-relation
   sans Stripe (recouvrement manuel = l'ops à éviter, et le code Connect existe déjà).
8. **Import Airbnb** : scrape live best-effort + validation proprio (les photos sont
   vitales, Inside Airbnb ne les a pas). Défaut retenu par Kami.
9. **URL** : section `/stays`, paiement 30 % acompte / 70 % solde (repris de Kairos).

## 4. Différence clé avec le car rental

Le car rental est **multi-devis** (plusieurs loueurs répondent, le client choisit).
Ici, une annonce = **un** proprio. Le mécanisme est donc plus proche du moteur de
réservation Kairos (1 bien, 1 owner) que du car rental. Le seul vrai delta à coder
par-dessus le moteur Kairos est l'**étape d'acceptation proprio** : aujourd'hui le
moteur Kairos laisse le voyageur réserver et payer directement ; ici on insère
`demande → le proprio valide et fixe son prix → le voyageur paie`.

## 5. Onboarding proprio (« colle ton lien et hop »)

1. Le proprio va sur `/stays/new` et colle son lien Airbnb.
2. Scrape live best-effort → pré-remplit titre, photos, description, prix indicatif,
   chambres, type. Le proprio valide / corrige en ~1 min et laisse email + téléphone.
   Si le scrape échoue, il complète manuellement (fallback, jamais bloquant).
3. Annonce créée en `draft`.
4. Pour **publier** : le proprio fournit l'**iCal privé Airbnb** (accessible depuis
   son seul compte host). Double usage : preuve qu'il contrôle l'annonce + sync des
   disponibilités. → statut `published`, l'annonce devient visible (SEO).
5. Étape guidée : ajouter l'**iCal d'export crete.direct dans son calendrier Airbnb**,
   pour bloquer chez Airbnb les dates réservées via crete.direct (anti double-booking
   cross-plateforme).
6. Le **KYC Stripe Connect** n'est déclenché qu'à sa 1ʳᵉ demande acceptée
   (juste-à-temps), pas à l'inscription.

## 6. Flux voyageur (demande → acceptation → paiement)

1. Le voyageur consulte une annonce `/stays/[slug]`, voit le prix proprio et le
   comparatif « vous payez X € — vs ~Y € sur Airbnb ».
2. Il choisit ses dates (calendrier alimenté par l'iCal), remplit contact + message.
   → `POST /api/stays/request`. Crée une `stay_request` (`pending`). Email + Telegram
   au proprio avec un lien token `/stays/approve/[token]`.
3. Le proprio ouvre son lien : voit les dates, **accepte (confirme ou ajuste son
   prix) ou refuse**. S'il accepte et n'a pas encore de compte Stripe Connect → il
   fait son onboarding Express KYC maintenant. → statut `approved`, `quoted_price`
   fixé. Email au voyageur « séjour accepté, payez pour confirmer » →
   `/stays/pay/[token]`.
4. Le voyageur paie via Stripe Checkout. **Destination charge** : prix proprio →
   compte Connect du proprio ; **+5 % → crete.direct** via `application_fee_amount`.
   Acompte 30 % puis solde 70 % (repris tel quel du moteur Kairos).
5. Webhook `checkout.session.completed` → statut `deposit_paid` puis `confirmed`,
   dates bloquées via la contrainte d'exclusion atomique (anti double-résa),
   emails voyageur + proprio. Idempotence via `stripe_webhook_events`.

**Annulation** : politique Kairos réutilisée (>14 j = 100 %, 2-14 j = 50 %,
<48 h = 0 %).

## 7. Anti-abus

`draft` au collage → `published` seulement avec iCal privé → **réservable** seulement
après KYC Stripe. Deux filtres naturels, aucune modération manuelle. En plus, repris
du pattern car rental : champ honeypot (`website`), rate-limit par IP, dédup des
demandes identiques, `ip_hash` SHA256 (RGPD).

## 8. Modèle de données (Supabase, pattern migrations `cp-multiquote`)

Nouvelles tables, dans une migration `.sql` versionnée + `notify pgrst, 'reload schema'` :

- **`stay_listings`** — une annonce. `id`, `owner_id`, `airbnb_id`, `airbnb_url`,
  `title`, `description`, `photos[]`, `zone_id`, `location_slug`, `lat`, `lng`,
  `property_type`, `bedrooms`, `beds`, `max_guests`, `base_price_eur` (prix net
  proprio), `cleaning_fee_eur`, `min_nights`, `amenities`, `commission_rate`
  (défaut 5), `stripe_connect_account_id`, `ical_private_url`, `ical_sync_meta`,
  `status` (`draft` | `published` | `unpublished`), `created_at`.
- **`stay_owners`** — le proprio. `id`, `name`, `email`, `phone`,
  `stripe_connect_account_id`, `kyc_status`, `created_at`.
- **`stay_availability`** — copié de Kairos. `listing_id`, `date`, `status`
  (`available` | `booked` | `blocked_ota` | `hold`), `source`, `booking_id`,
  `price_override`.
- **`stay_requests`** — le cœur. `id`, `listing_id`, `guest_name`, `guest_email`,
  `guest_phone`, `date_from`, `date_to`, `pax`, `message`, `status` (`pending` |
  `approved` | `declined` | `expired` | `deposit_paid` | `confirmed` | `cancelled`),
  `quoted_price_eur` (fixé par le proprio), `quoted_at`, `approve_token_hash`,
  `pay_token_hash`, `stripe_session_id`, `deposit_amount`, `deposit_paid_at`,
  `deposit_payment_intent_id`, `balance_amount`, `balance_paid_at`,
  `balance_payment_intent_id`, `commission_eur`, `ip_hash`, `created_at`.
- Réutilise **`stripe_webhook_events`** (idempotence) — à porter depuis Kairos.

## 9. Réutilisation vs code neuf

**Copié / porté depuis le siteweb Kairos** (le gros du travail, déjà écrit et
production-ready) :

- Stripe Connect onboarding Express (`api/stripe/connect/onboard`,
  `api/owner/property/stripe`) → destination charge + `application_fee_amount`.
- Webhook idempotent (`stripe_webhook_events`, PK = `stripe_event_id`).
- Booking atomique : RPC `create_booking_atomic` + contrainte d'exclusion GIST sur
  `daterange` (double-booking impossible au niveau DB).
- Import iCal (`src/lib/booking/ical-import.ts`).
- Calcul de prix côté serveur (anti-tampering).

**Nouveau (spécifique Stays)** :

- Scrape live d'une annonce Airbnb par URL (parser best-effort + fallback manuel).
- Étape `request → approve` (acceptation proprio avec fixation du prix), absente du
  moteur Kairos.
- Pages `/stays`, `/stays/[location]`, `/stays/[slug]`, wizard onboarding
  « colle ton lien », `/stays/approve/[token]`, `/stays/pay/[token]`.
- Export iCal de crete.direct (pour bloquer les dates chez Airbnb).
- Emails Resend (demande au proprio, acceptation au voyageur, confirmations, refus).

## 10. Légal / CGU

Page `/stays/terms` posant que crete.direct est un **intermédiaire technique**
(mise en relation + encaissement), **jamais** hébergeur ni assureur, hors litige et
hors caution. Rappel que le proprio reste responsable de sa licence AMA et de sa
déclaration fiscale grecque (CFF) — crete.direct n'est pas garant de sa conformité.

## 11. Phasage

- **Phase 1 (produit vendable)** : onboarding lien + iCal, annonces publiées, flux
  demande → acceptation → paiement Stripe Connect, emails, export iCal, CGU.
- **Phase 2** : empreinte CB caution (si réclamée), dashboard proprio, enrichissement
  Inside Airbnb (occupancy / revenue estimés affichés au proprio comme argument
  d'inscription).

## 12. Risques et points de vigilance

- **Scrape Airbnb** : fragile (anti-bot, TOS host). Mitigé par le fallback manuel et
  le fait que le proprio valide/republie sciemment son propre contenu.
- **Double-booking cross-plateforme** : dépend du proprio qui ajoute bien l'iCal
  d'export crete.direct dans son Airbnb. Étape critique à rendre incontournable au
  onboarding ; sinon une résa crete.direct + une résa Airbnb aux mêmes dates.
- **Duplication du moteur** : deux copies du moteur de réservation (Kairos +
  crete.direct) à maintenir. Acceptable au vu du gain de rapidité ; refactoring en
  package partagé possible plus tard si un 3ᵉ site en a besoin.
- **Politique de build crete.direct** : `main` est buildé/déployé, `master` jamais.
  Travailler la feature sur une branche `feat/*` (Preview opt-in via `[preview]`).
