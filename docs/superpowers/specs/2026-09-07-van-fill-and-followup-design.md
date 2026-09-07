# van.crete.direct : remplir un premier groupe et ne plus perdre ceux qui s'inscrivent

Spec de design, 07/09/2026. Pas de code ici. Le produit vit dans **deux dépôts** :

- `~/van-crete-direct` (branche `master`, projet Vercel distinct, un seul cron `/api/cron/evaluate` à 07:00 UTC) : corridors, groupes, réservations, emails, admin.
- `~/cretepulse-build` (ce dépôt) : les points d'entrée côté crete.direct, `src/components/VanPromo.tsx`, `src/app/[locale]/buses/VanInterest.tsx`, `src/lib/van-corridors.ts` (copie manuelle de `van_corridors`), `src/app/api/buses/van-interest/route.ts`.

Les deux lisent la même base `cretepulse-postgres` (tables `van_corridors`, `van_groups`, `van_bookings`, `van_requests`).

## 0. Ce que la base dit le 07/09/2026

[FACT 2026-09-07, SQL sur `cretepulse-postgres`]

- 22 corridors, 12 adossés à un coût opérateur, 4 opérateurs actifs.
- 13 groupes : 3 `open`, tous `chania-airport--paleochora` (départs 07/09, 09/09, 21/09 ; `pax_active` 1, 1 et 2 pour un seuil de 4), 10 `cancelled`. **Aucun groupe n'a jamais atteint 4, aucun n'a jamais été `confirmed` ni `completed`.**
- 10 réservations : 5 `active` (6 pax, 164 €), **3 `pending_confirm` jamais confirmées ni relancées** (ids 27, 28, 31, créées entre le 05/08 et le 25/08), 2 `cancelled`.
- 3 réservations Paleochora en 48 h les 04 et 05/09 : premier corridor avec une demande répétée.
- Plausible 30 j : 85 visiteurs, `van_offer_click` 16, `van_booking_ok` 8, soit **9,4 % de conversion, le meilleur ratio du site**. Entrées : Facebook 29, direct 25, `bus-pair` 5. `promo_impression` bloc `van-promo` : 325, contre 3 470 pour `car-promo`.
- Les paires aéroport sont les recherches bus les plus fréquentes (`bus_search` : heraklion 494, chania 325, chania-airport 144).
- Le script `invite-van-requests.mjs` cité en mémoire n'existe plus dans aucun dépôt. Son rôle est repris par l'étape 3 de `evaluate/route.ts` (`classifyRequests`), mais les 2 `van_requests` hors corridor des 30 derniers jours sont `expired` sans qu'aucun email ne soit parti.
- Coût d'un groupe Paleochora fermé : ~109,50 € net pour le petit véhicule, contre 4 × 31 € encaissés au seuil.

⛔ `src/lib/van-corridors.ts` affiche encore 30 € pour Paleochora alors que la base dit 31 €. C'est le doublon « tenu à la main » annoncé en tête du fichier : à resynchroniser dans ce chantier (section 6).

### Ce qui arrive aujourd'hui à un groupe sous le seuil, lu dans le code

`classifyForCron` (`van-crete-direct/src/lib/status.ts`) :

- J-2, J-1, J-0 : le groupe `open` entre dans `j2Decisions` **trois matins de suite** et ne produit qu'un message Telegram « confirmer quand même, reporter ou annuler ». Aucune action automatique, aucun email au voyageur.
- J-1 : `sendReconfirmEmail` aux réservations `active` (« votre départ n'est pas encore confirmé, partagez le lien »).
- Le lendemain du départ (`d < 0`) : `staleCancels` passe le groupe en `cancelled` et envoie `sendCancelledEmail` aux seuls `active`. **Le voyageur apprend que le van n'est pas parti après la date du trajet.**

Le groupe du 07/09 est exactement là : 1 inscrit actif, départ ce soir, le cron de ce matin a émis la ligne J-0 sur Telegram, et le seul geste possible aujourd'hui est manuel. Demain 07:00 UTC il sera annulé et le voyageur recevra « pas assez de voyageurs » pour un trajet d'hier.

Les `pending_confirm` : `grep pending_confirm` dans `van-crete-direct/src` ne rend que `api/confirm/route.ts`, `confirm/[token]/page.tsx` et le Telegram de `api/book/route.ts`. **Aucune relance, aucune expiration.** `getActiveBookingsForGroup` filtre `status='active'`, donc un pending n'est même pas prévenu de l'annulation de son groupe.

## 1. Objectif et non-objectifs

**Objectif unique : un premier groupe `completed` avant le 30/09/2026** (le « done » du brief s'appelle `completed` dans `GroupStatus`). Le candidat naturel est le groupe Paleochora du 21/09 (2 pax actifs, J-2 le 19/09) ; tout nouveau groupe Paleochora en septembre en est un autre.

Trois leviers, dans cet ordre : ne plus perdre ceux qui ont déjà rempli le formulaire (section 2), donner une issue à un groupe sous seuil autre que « annulé après coup » (section 3), amener plus de voyageurs sur les corridors qui ont déjà de la demande (section 4).

Non-objectifs, assumés :

- Pas de paiement en ligne. Le tunnel Stripe est reporté à 2027 pour toute la maison, le van suit.
- Pas de nouveaux corridors, pas de nouveaux opérateurs : les 10 corridors sans demande restent tels quels (mémoire du 13/08 : y chercher un opérateur serait du travail pour zéro demande).
- Pas d'ouverture du post Facebook automatique (`fb-listener`, `publishPost` jamais exécuté en réel, session perdue) : chantier séparé.
- Pas de refonte de la carte du rail home ni de la photo `ferry.jpg`.
- Les promos van sur les articles : **spec `2026-09-07-article-service-promos-design.md`, écrite en parallèle**. Cette spec fournit seulement ce dont l'autre a besoin (section 4.3).
- Aucun chiffre de revenu n'est promis nulle part, ni au voyageur, ni dans un email ops.

## 2. Relance des `pending_confirm`

### 2.1 Pourquoi maintenant, alors que la mémoire du 10/08 l'avait écartée

La décision du 10/08 (« à reconsidérer vers ~10 bookings/mois ») reposait sur 2 visiteurs par jour et 2 réservations depuis le lancement. Le 07/09 : 10 réservations, dont 3 sur le même corridor en 48 h, et 3 pending sur 10, soit **30 % de la demande réelle perdue au double opt-in**. Le volume qui justifiait d'attendre est atteint sur un corridor.

### 2.2 Règle

Pour toute réservation `pending_confirm` dont le groupe est encore `open` ou `threshold_reached` et dont `travel_date >= aujourd'hui` :

| âge (jours depuis `created_at`, calendrier Athènes) | action |
|---|---|
| 1 | email `REMIND_1`, lien `/{locale}/confirm/{token}` |
| 3 | email `REMIND_2`, même lien, ton plus court |
| 5 | passage en `cancelled`, `cancel_reason = 'confirm_expired'`, aucun email |

Bornes :

- Si `travel_date - aujourd'hui <= 1` et aucune relance envoyée : une seule relance immédiate, expiration à `travel_date` (on ne relance pas un trajet passé).
- Si le groupe est `cancelled` ou `completed`, ou si `travel_date < aujourd'hui` : `cancelled`, `cancel_reason = 'group_closed'`, aucun email.
- Le lien est celui qui existe déjà : `token` est un aléa de 128 bits unique par réservation (`createBooking`, `randomBytes(16)`), lu par `getBookingByToken` qui refuse tout ce qui n'est pas 32 hexadécimaux, et la page `/confirm/[token]` ne mute qu'en POST (`ConfirmButton`). C'est déjà un lien signé au sens utile : personne ne le devine, il n'ouvre que sa propre réservation. Pas de HMAC en plus.

### 2.3 Où ça vit

- `van-crete-direct/src/lib/status.ts` : nouvelle fonction pure `classifyPendingBookings(bookings, groupsById, todayISO)` qui rend `{ remind1, remind2, expire, closeWithGroup }`. Même style que `classifyForCron`, testable sans base.
- `van-crete-direct/src/lib/bookings.ts` : `getPendingBookings()` (tous les `pending_confirm`, sans filtre de date, comme le cron le fait pour les groupes) et `cancelBooking(id, reason)` qui remplace l'appel `setBookingStatus(id, "cancelled")` partout (`api/cancel/route.ts` passe `reason = 'traveller'`).
- `van-crete-direct/src/lib/emails.ts` : `sendRemindEmail(b, c, g, step: 1 | 2): Promise<boolean>` sur le modèle de `sendInviteEmail` (rend `true` seulement si Resend accepte ; le compteur ne bouge qu'à cette condition, sinon la relance repart le lendemain).
- `van-crete-direct/src/app/api/cron/evaluate/route.ts` : étape 1 bis, entre la clôture des groupes passés et l'étape seuil. Une ligne dans la réponse JSON : `pendingReminded`, `pendingExpired`.

### 2.4 Rattrapage des ids 27, 28, 31

Aucun script à part : la première passe du cron les traite avec la règle générale. Leurs dates de voyage connues sont passées (27 : groupe 14 du 10/08 ; 28 : groupe 15 du 16/08 ; 31 : à lire en base) donc l'issue attendue est `cancelled` / `group_closed`, sans email. Si l'une des trois porte encore une date à venir, elle reçoit `REMIND_1` le jour même. Le résumé Telegram de cette première passe liste les trois ids et leur issue, c'est le seul « rattrapage » : trois adresses de voyageurs qui voulaient un van, à disposition d'une relance humaine si on le souhaite, pas d'un automate.

## 3. La règle du groupe sous seuil

### 3.1 Choix : option A, départ garanti à tarif recalculé, avec repli sur B

**Option A retenue** quand le corridor a un coût connu (`cost_small_eur` non nul, 12 corridors sur 22). **Option B (annuler et prévenir) reste la règle pour les 10 autres**, et devient le repli de A quand personne n'accepte.

Pourquoi A :

- B est le statu quo : 10 groupes annulés, 0 parti. Reconduire B ne peut pas produire l'objectif de la section 1.
- Le voyageur qui a réservé Chania Airport → Paleochora n'a comme alternative que deux bus avec correspondance ou un transfert privé à plein tarif. Un véhicule garanti à `cost_small × 1,10 / pax_active` reste sous le transfert privé dès 2 passagers (≈ 61 € par place à 2 pour Paleochora, contre ~120 € pour le véhicule seul).
- crete.direct ne subventionne rien : le tarif recalculé couvre toujours `cost_small × 1,10`. Aucun paiement n'est encaissé en ligne, la marge n'entre pas dans la promesse faite au voyageur.
- A donne une réponse **avant** le départ, B telle qu'elle existe la donne après.

Formule, dans `van-crete-direct/src/lib/types.ts` à côté de `marginAtThreshold` : `guaranteePerSeat(c, paxActive) = Math.ceil(Number(c.cost_small_eur) * 1.10 / paxActive)`, `null` si `cost_small_eur` est nul. Le **plafond** est le prix du véhicule : `Math.ceil(cost_small × 1,10)`, ce que paierait un voyageur seul. Le tarif public du corridor reste le plancher : si des voyageurs rejoignent après la proposition, la place ne coûte jamais moins que `price_eur`, et jamais plus que le montant proposé. Ce « au plus N € » est ce qui permet de ne pas ré-écrire à chaque nouveau membre.

### 3.2 Le texte, affiché AVANT la réservation

Aujourd'hui le voyageur lit « Départ confirmé à 4 » (`[corridor]/page.tsx` `step3t`, `BookingForm.tsx` `okBody`, `confirm/[token]/page.tsx` `lead`, `VanPromo.tsx` `line`) et rien sur ce qui se passe sinon. Quatre endroits, une phrase, en quatre langues, à écrire une fois dans `van-crete-direct/src/lib/i18n.ts` et importer :

> À 4 voyageurs, le van part au tarif affiché. En dessous, 2 jours avant le départ, nous vous proposons soit un départ garanti au tarif partagé entre les inscrits (au plus {cap} € pour le véhicule), soit l'annulation sans frais. Rien n'est prélevé en ligne.

Corridors sans coût connu : la phrase perd son premier terme (« 2 jours avant le départ, nous vous prévenons si le van ne part pas. Rien n'est prélevé. »). `{cap}` vient de la base, jamais d'une constante. Côté crete.direct, `VanPromo.tsx` ne connaît que `VAN_CORRIDORS` : ajouter `guaranteeCapEur: number | null` à `VanCorridor` dans `src/lib/van-corridors.ts` (section 6).

### 3.3 Déroulé

Tout dans `evaluate/route.ts`, à la place du bloc `j2Decisions` actuel. `classifyForCron` rend deux nouvelles listes, `j2Proposals` et `j1Settlements`, et cesse de mettre le même groupe dans `j2Decisions` trois jours de suite.

**J-2, 07:00 UTC** (et J-1 en rattrapage si `guarantee_proposed_at` est nul, cas d'un groupe créé la veille) :

- `pax_active = 0` : `cancelled`, `cancel_reason = 'no_traveller'`, aucun email, aucun Telegram (rien à décider).
- `cost_small_eur` nul : option B, `cancelled`, `cancel_reason = 'below_threshold'`, `sendCancelledEmail` aux `active` (l'email existant, dont le CTA renvoie vers la landing pour une autre date), Telegram silencieux « corridor sans coût, option A indisponible ».
- sinon : le groupe reçoit `guarantee_price_eur`, `guarantee_proposed_at`, `guarantee_deadline` (= la passe du lendemain). Chaque `active` reçoit `PROPOSE` : trajet, « il manque N voyageurs », « départ garanti à au plus {price} € par place, réponse avant demain {heure} Athènes », deux boutons vers `/{locale}/guarantee/{token}`. Telegram, non silencieux : « proposition envoyée à N voyageurs, prix X, échéance demain » avec le lien admin. **Aucune confirmation ops n'est attendue à ce stade** : le prix découle d'un coût que François a déjà validé en écrivant `cost_small_eur`, et c'est le voyageur qui décide. Le veto ops existe déjà, c'est le bouton `cancel` de `/admin`.

**Page `/{locale}/guarantee/[token]`** (nouveau, calquée sur `confirm/[token]/page.tsx`) : rendu serveur, rappelle trajet, date, fenêtre, « au plus X € par place », deux boutons POST vers `/api/guarantee` `{ token, answer: 'accepted' | 'declined' }`. Le token est celui de la réservation, donc personnel : c'est un lien d'authentification, il n'est **jamais** proposé au partage (le filet `share.test.ts` reste vrai). Après réponse : `guarantee_answer`, `guarantee_answered_at` sur la réservation ; `declined` passe la réservation en `cancelled`, `cancel_reason = 'guarantee_declined'`, et `recalcGroup` tourne. Idempotent : une deuxième réponse ne change rien et redirige vers `/g/{token}`.

**J-1, 07:00 UTC** (`j1Settlements`, groupes `open` avec `guarantee_proposed_at` non nul) :

- Au moins un `active` a accepté et `pax_active > 0` : groupe `guaranteed`. Telegram **ACTION** : « affréter, puis confirmer l'heure exacte dans /admin avant ce soir ». Les acceptants reçoivent `GUARANTEED` (« votre départ est garanti, heure et point de rendez-vous suivent »). Ceux qui n'ont pas répondu restent `active` au tarif « au plus X € » (ils ont été prévenus la veille, le silence ne les exclut pas d'un van qui part).
- Personne n'a accepté : `cancelled`, `cancel_reason = 'guarantee_no_answer'`, `sendCancelledEmail` aux `active`, Telegram silencieux.

**Après `guaranteed`** : le flux existant reprend. L'action admin `confirm` (heure exacte) envoie `sendConfirmedEmail`, le J-1 `sendReminderEmail` s'applique aux `guaranteed` comme aux `confirmed`, `staleCompletes` clôt en `completed` le lendemain. `nextStatusAfterRecalc` traite `guaranteed` comme `confirmed` (jamais redescendu par un recalcul), sauf si `pax_active` tombe à 0 : retour à `open`, et la passe suivante annule (`no_traveller`).

Un groupe `guaranteed` reste rejoignable au tarif public jusqu'au départ (`getOpenGroupsForCorridor` et la liste de `[corridor]/page.tsx` l'incluent). C'est le sens du « au plus » : chaque arrivant baisse la note des autres, personne n'a à recevoir un nouvel email.

### 3.4 Les trois groupes d'aujourd'hui

- **07/09** : hors de portée du code. Départ ce soir, 1 actif, la passe de demain l'annulera et l'email arrivera après coup. Le seul geste possible aujourd'hui est un message manuel à ce voyageur, depuis l'alerte Telegram qui porte son email. Propriétaire François, aujourd'hui.
- **09/09** : J-2 est aujourd'hui, la passe de 07:00 UTC est déjà passée, et cette spec ne sera pas en production demain matin. Même traitement manuel, avec le texte de `PROPOSE` (au plus 121 € pour 1 voyageur, soit le véhicule seul : c'est un transfert privé au prix coûtant, à lui de dire oui ou non). Si le code arrivait avant le 08/09 07:00 UTC, le rattrapage J-1 de 3.3 le prendrait.
- **21/09** : premier passage réel de la règle, J-2 le 19/09. À 2 pax : au plus 61 € par place. C'est le groupe qui peut devenir le premier `completed`.

## 4. Remplissage

### 4.1 Planner bus : montrer l'offre, pas le formulaire de capture

Vérifié dans `src/app/[locale]/buses/JourneyPlanner.tsx` : le planner ne monte **jamais** `VanPromo`. Sur une paire couverte par un corridor, il affiche `VanInterest` (`journey-indirect` ou `journey-no-route`), qui écrit une `van_requests`, que le cron invite **le lendemain** par email vers une landing où le voyageur aurait pu réserver tout de suite. Sur Chania Airport → Paleochora, qui n'a pas de bus direct, c'est le parcours par défaut. La source `bus-pair` existe, mais seulement sur les pages `/buses/[pair]/page.tsx` (ligne 402).

Règle : dans `JourneyPlanner`, dès que `searched` et que `vanCorridorsForPair(taxiSlugA, taxiSlugB)` n'est pas vide, monter `VanPromo` avec `source="journey-planner"` **quel que soit le résultat bus** (direct compris : sur Heraklion Airport → Agios Nikolaos le bus existe et le van reste une troisième option), à la place de `VanInterest`. `VanInterest` ne reste que pour les paires sans corridor. Le lien porte déjà `?source=`, ajouter `&date={date}` pour que la landing pré-remplisse la date du planner (`[corridor]/page.tsx` lit `searchParams.date` et `win`). C'est le levier le plus court : les paires aéroport sont les recherches les plus fréquentes du site et la promo n'y est pas.

### 4.2 Pages `/airport/[slug]`

`src/app/[locale]/airport/[slug]/page.tsx` ne monte que `CarPromo` (`source="airport"`, ligne 659). Ajouter, sous le lien « de l'aéroport au centre », un `VanPromo` `source="airport"` avec les corridors **au départ** de cet aéroport : nouvelle fonction `vanCorridorsFrom(busSlug)` dans `src/lib/van-corridors.ts` (même normalisation `normalizeBusSlug`), triée par prix. `VanPromo` prend `corridors[0]` comme titre ; pour un aéroport, passer un libellé « vers Paleochora, Rethymno, ... » plutôt qu'une seule destination : prop optionnelle `multi: true` qui liste jusqu'à 4 destinations et pointe vers la home van filtrée `https://van.crete.direct/{locale}/?from={slug}`. Sitia (`JSH`) n'a aucun corridor : rien ne s'affiche.

### 4.3 Articles

Hors périmètre ici. La spec `2026-09-07-article-service-promos-design.md` monte les promos sur les guides ; ce qu'elle doit savoir de cette spec : `VanPromo` accepte déjà `source`, `vanCorridorsForPair` et `vanCorridorsFrom` sont les deux sélecteurs, `promo_impression` porte `block: "van-promo"`. Les articles aéroport et transferts (`getting-around/heraklion-airport-to-city`, `chania-airport-to-city`) sont ceux où le van a un sens ; le reste est à elle.

### 4.4 Email « il manque N places »

Deux déclencheurs, un seul email `FILL_NUDGE` :

- Événement : dans `api/confirm/route.ts`, quand une réservation devient `active` sans franchir le seuil, les **autres** `active` du groupe reçoivent « un voyageur de plus, il en manque N ». Pas d'email à celui qui vient de confirmer (il voit la jauge sur `/g/{token}`).
- Cron : à J-5 (ou à la première passe si le groupe est créé plus tard), une fois par groupe, `fill_nudge_sent_at` sur `van_groups`.

Le lien de l'email est `shareUrl(locale, c.slug, g.travel_date, g.time_window)` (`van-crete-direct/src/lib/i18n.ts`), c'est-à-dire la landing pré-remplie, **jamais** `/g/{token}` ni `/confirm/{token}`. Le test `share.test.ts` « ne contient jamais le token d'un booking » est étendu au corps de `FILL_NUDGE` et de `PROPOSE` : le lien à partager et le lien d'action ne sont pas dans la même variable. La règle du dépôt (`van-crete-direct/CLAUDE.md`) est celle-là.

Le J-1 `RECONFIRM` existant parle déjà de partage ; il n'est pas doublé : un groupe qui reçoit `PROPOSE` à J-2 ne reçoit pas `RECONFIRM` à J-1 (`classifyForCron` exclut de `j1Reconfirms` les groupes avec `guarantee_proposed_at`).

## 5. Demandes hors corridor : répondre, pas expirer

`classifyRequests` marque `no_corridor` et alerte Telegram, puis la demande dort jusqu'à `expired`. Le voyageur n'a rien reçu. Remplacer le silence par un email `NO_CORRIDOR`, envoyé une fois, au moment du marquage `no_corridor` (même boucle `toSignal`, après l'alerte, avant l'update, comme aujourd'hui), avec trois options :

1. **Le corridor le plus proche**, s'il existe : un corridor actif partageant `from_slug` ou `to_slug` normalisés avec la demande (`nearestCorridor(request, corridors)` dans `status.ts`, pure). Lien `shareUrl(locale, slug, travel_date)`. Sans corridor voisin, l'option disparaît, l'email en a deux.
2. **La voiture** : `https://crete.direct/{locale}/car-rental?pickup={from_slug}` (la landing qui existe, `CAR_PICKUP` de la page aéroport donne le vocabulaire).
3. **Le bus** : `https://crete.direct/{locale}/buses/{pairSlug(from, to)}` quand `best_changes >= 0` (la paire a un trajet, même avec correspondance) ; sinon le planner `/buses`.

Idempotence : `van_requests.answered_at`, posé seulement si Resend accepte. L'email n'est pas renvoyé si le corridor s'ouvre ensuite : à ce moment c'est `INVITE` qui part, comme aujourd'hui. Les demandes déjà `expired` ne sont pas reprises.

## 6. Données

Une migration dans `van-crete-direct/migrations/20260908_followup_guarantee.sql`, additive, `if not exists` partout, `notify pgrst, 'reload schema'` à la fin comme les précédentes.

`van_bookings` :
- `confirm_reminders smallint not null default 0`, `last_reminder_at timestamptz`
- `confirmed_at timestamptz` (posé par `api/confirm`, c'est la mesure du délai de la section 9)
- `cancel_reason text` avec `check (cancel_reason is null or cancel_reason in ('traveller','confirm_expired','group_closed','guarantee_declined'))`
- `guarantee_answer text check in ('accepted','declined')`, `guarantee_answered_at timestamptz`

`van_groups` :
- `status` : le CHECK gagne `'guaranteed'`
- `guarantee_price_eur numeric(6,2)`, `guarantee_proposed_at timestamptz`, `guarantee_deadline timestamptz`
- `fill_nudge_sent_at timestamptz`
- `cancel_reason text check in ('no_traveller','below_threshold','guarantee_no_answer','date_passed','admin')` ; `staleCancels` pose `date_passed`, l'action admin `cancel` pose `admin`

`van_requests` : `answered_at timestamptz`.

Aucune colonne sur `van_corridors` : le plafond se dérive de `cost_small_eur`. Avant de compter sur l'option A pour Paleochora, **lire en base que `cost_small_eur` de `chania-airport--paleochora` vaut bien 109,50** : le 02/08 il était nul (seul `cost_large_eur = 132,50` était connu).

Types (`van-crete-direct/src/lib/types.ts`) : `GroupStatus` gagne `guaranteed`, `Booking` et `Group` gagnent les champs ci-dessus, `BookingStatus` ne change pas. Tous les `.in("status", ["open","threshold_reached","confirmed"])` du dépôt (`groups.ts`, `admin/page.tsx`, `evaluate/route.ts`) ajoutent `guaranteed` : trois occurrences, à grep avant d'éditer.

`cretepulse-build/src/lib/van-corridors.ts` : `VanCorridor` gagne `guaranteeCapEur: number | null`, Paleochora passe à 31 €, et un test `src/lib/van-corridors.test.ts` compare le fichier à un export SQL de `van_corridors` déposé en fixture (`select slug, price_eur, cost_small_eur from van_corridors where active`), pour que la dérive se voie au prochain écart.

## 7. Erreurs et idempotence

- **Une passe par jour, rejouable.** Chaque étape sélectionne sur l'état (`confirm_reminders`, `guarantee_proposed_at`, `fill_nudge_sent_at`, `answered_at`) et non sur « c'est aujourd'hui J-2 » seul. Relancer le cron deux fois le même jour n'envoie rien de plus.
- **Email d'abord, état ensuite, état seulement si Resend accepte** (pattern `sendInviteEmail` / `deliver`). Le cas inverse (email parti, update échoué) produit au pire un doublon le lendemain, journalisé ; l'autre ordre perd un voyageur en silence.
- **Mises à jour conditionnelles** : chaque changement de statut porte `.eq("status", <statut lu>)` comme `recalcGroup` et `staleCancels`. Deux passes concurrentes ne peuvent pas annuler puis garantir le même groupe.
- **Telegram best-effort** (`van-crete-direct/src/lib/telegram.ts` ne jette jamais). Le van n'utilise pas `ops-notify.ts` de cretepulse-build (forum unifié, sujet ACTION, `silent`) ; les messages ACTION de cette spec (J-1 affrètement) gagneraient à y passer, c'est une migration d'un fichier à copier, optionnelle, hors effort.
- **Une réponse à une garantie après l'échéance** : acceptée si le groupe est encore `open` ou `guaranteed`, refusée avec redirection vers `/g/{token}` si `cancelled`. Pas de 500 sur un token périmé, la page dit ce qui s'est passé.
- **Une erreur de lecture d'une étape ne bloque pas les autres** : même découpage que l'étape 3 actuelle (`reqErr` non bloquant).
- **Le cron reste sous `isCronAuthorized`** (`cron-auth.ts`), rien de nouveau n'est exposé sans le secret ; `/api/guarantee` est POST, sans GET, pour les mêmes raisons que `/api/confirm` (scanners qui suivent les liens).
- **Plafond d'envois** : une passe ne peut écrire qu'aux voyageurs de groupes vivants, bornés par `MAX_GROUP_PAX = 8` et le nombre de groupes, aucun envoi de masse possible par construction.

## 8. Tests

`van-crete-direct` (vitest, `npm test`) :

- `src/lib/__tests__/status.test.ts` : `classifyPendingBookings` (J+1, J+3, J+5, trajet demain, groupe fermé, date passée) ; `classifyForCron` ne met plus un groupe dans `j2Proposals` deux jours de suite ; `j1Settlements` ; `nextStatusAfterRecalc` garde `guaranteed` sauf à 0 pax ; `nearestCorridor` (même départ, même arrivée, aucun).
- `src/lib/__tests__/guarantee.test.ts` : `guaranteePerSeat` (arrondi au-dessus, `null` sans coût, plafond véhicule, plancher prix public quand des voyageurs rejoignent).
- `src/lib/__tests__/emails.test.ts` : `sendRemindEmail` rend `false` sur refus Resend ; `PROPOSE` affiche « au plus » et le prix du corridor, jamais 4 en dur ; `FILL_NUDGE` et `NO_CORRIDOR` passent par `shareUrl` ; `NO_CORRIDOR` sans corridor voisin n'a que deux options.
- `src/lib/__tests__/share.test.ts` : le corps de `FILL_NUDGE` et de `PROPOSE` ne contient ni `/g/` ni `/confirm/` dans le lien de partage ; le lien d'action de `PROPOSE` pointe bien `/guarantee/{token}` et n'apparaît jamais dans un texte de partage.
- `src/app/api/guarantee/route.test.ts` : accept, decline, double réponse, groupe annulé, token inconnu.
- `src/lib/__tests__/validate.test.ts` : inchangé, sert de garde de non-régression.

`cretepulse-build` (tests colocalisés `*.test.ts`) :

- `src/lib/van-corridors.test.ts` : `vanCorridorsFrom`, et synchro avec la fixture SQL (section 6).
- `src/app/[locale]/buses/JourneyPlanner.test.tsx` : sur une paire couverte, `VanPromo` est rendu avec `source="journey-planner"` et `VanInterest` ne l'est pas ; sur une paire non couverte, l'inverse.
- `src/components/VanPromo.test.tsx` : le texte affiche le plafond du corridor quand il existe, la phrase courte sinon.

## 9. Mesure

- **Le chiffre qui compte** : `select count(*) from van_groups where status='completed' and travel_date <= '2026-09-30'` doit valoir au moins 1. Zéro aujourd'hui.
- **Taux pending → confirmé** : `sum(status <> 'pending_confirm' and confirmed_at is not null) / count(*)` sur les réservations créées après le déploiement, à comparer aux 7/10 d'avant (3 pending sur 10, jamais relancés). Et par palier : confirmé avant J+1, entre J+1 et J+3, après J+3, pour savoir laquelle des deux relances travaille.
- **Délai** : médiane de `confirmed_at - created_at`.
- **Issue des garanties** : répartition de `guarantee_answer` et de `cancel_reason` par corridor. Si `guarantee_no_answer` domine, c'est l'échéance de 24 h qui est trop courte, pas le prix.
- **Entrées** : `van_offer_click` par `source` (`journey-planner` et `airport` sont neuves), `promo_impression` bloc `van-promo` (325 aujourd'hui), en gardant en tête que Plausible sous-compte le van (`van_booking_submit` à zéro sur tout l'historique alors que des réservations existent : la base fait foi).
- **Hors corridor** : `van_requests.answered_at` non nul sur 100 % des `no_corridor` créées après déploiement.

Lecture le 01/10/2026, dans la fiche `project_crete_direct_van_partage.md`.

## 10. Effort et ordre

| # | lot | dépôt | heures |
|---|---|---|---|
| 1 | Relance et expiration des `pending_confirm`, `cancel_reason`, migration (partie réservations), passe cron, tests | van-crete-direct | 3 |
| 2 | Règle sous seuil : migration (partie groupes), `guaranteePerSeat`, page et route `/guarantee`, emails `PROPOSE` et `GUARANTEED`, `j2Proposals` / `j1Settlements`, statut `guaranteed` dans les 3 listes, carte admin, texte avant réservation aux 4 endroits | van-crete-direct + `VanPromo.tsx` | 6 |
| 3 | Remplissage : `VanPromo` dans le planner, `vanCorridorsFrom` + page aéroport, `FILL_NUDGE` (événement + J-5), synchro `van-corridors.ts` et son test | cretepulse-build + van-crete-direct | 4 |
| 4 | `NO_CORRIDOR` trois options, `nearestCorridor`, `answered_at` | van-crete-direct | 2 |
| 5 | Vérifications réelles : `cost_small_eur` Paleochora en base, passe de cron en `--dry-run` sur les 3 pending, un `PROPOSE` reçu sur une adresse de test, mockup des 4 textes avant push | les deux | 1,5 |

Total ≈ 16,5 h. Ordre 1 → 2 → 3 → 4 → 5. Le lot 1 seul déjà change quelque chose pour la prochaine réservation ; le lot 2 doit être en production avant le **19/09 07:00 UTC** pour que le groupe du 21/09 passe par la règle et non par l'annulation du 22/09. Côté cretepulse-build, le lot 3 suit la règle du dépôt : branche `feat/*`, `npm run ship`, départ au déploiement de 20h Athènes.

## Fichiers lus

`~/van-crete-direct` : `CLAUDE.md`, `vercel.json`, `package.json`, `src/lib/status.ts`, `src/lib/groups.ts`, `src/lib/bookings.ts`, `src/lib/types.ts`, `src/lib/corridors.ts`, `src/lib/db.ts`, `src/lib/emails.ts`, `src/lib/resend-send.ts`, `src/lib/telegram.ts`, `src/lib/i18n.ts` (`shareUrl`), `src/lib/cron-auth.ts`, `src/lib/validate.ts`, `src/app/api/cron/evaluate/route.ts`, `src/app/api/book/route.ts`, `src/app/api/confirm/route.ts`, `src/app/api/cancel/route.ts`, `src/app/api/admin/action/route.ts`, `src/app/[locale]/confirm/[token]/page.tsx`, `src/app/[locale]/g/[token]/page.tsx` (extraits), `src/app/[locale]/[corridor]/page.tsx` (extraits), `src/components/BookingForm.tsx` (extraits), `src/components/ShareRide.tsx`, `src/app/admin/page.tsx` et `AdminGroupCard.tsx` (extraits), `migrations/20260712_van_product.sql`, `20260712_van_product_checks.sql`, `20260802_corridor_cost_and_zones.sql`, `20260813_booking_luggage.sql`, `src/lib/__tests__/status.test.ts`, `emails.test.ts`, `share.test.ts` (titres).

`~/cp-specs-360` : `vercel.json`, `src/lib/van-corridors.ts`, `src/lib/ops-notify.ts`, `src/lib/airports.ts` (extraits), `src/components/VanPromo.tsx`, `src/components/car-rental/CarPromo.tsx` (extrait), `src/app/[locale]/buses/VanInterest.tsx`, `src/app/[locale]/buses/JourneyPlanner.tsx` (lignes 440 à 675), `src/app/[locale]/buses/[pair]/page.tsx` (lignes 270 à 425), `src/app/[locale]/airport/[slug]/page.tsx` (extraits), `src/app/api/buses/van-interest/route.ts`, `supabase/migrations/20260711_van_requests.sql`, `src/app/api/cron/` (liste).

`~/van-outreach-build` : liste des scripts (`find_van_partners.py`, `detect_replies.py`, `send_recruitment.py`, `send_relance.py`, `crontab-van.txt`), non lus : outbound partenaires, hors périmètre.

Mémoire : `project_crete_direct_van_partage.md` (lignes 1 à 140 et 640 à 662), `audit_crete_direct_360_2026-09-07.md` (lignes van), `session_log.md` (entrées du 07/09).
