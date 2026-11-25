# Location de voiture : catalogue de prix des loueurs et acompte en ligne

Date : 2026-11-25
Statut : design à valider par François avant plan d'implémentation
Branche : `feat/car-catalogue` (worktree `~/cp-ektel-wp`), dépôt crete.direct
Specs amont : `2026-07-08-car-rental-multi-quote-design.md` (devis multiples), `2026-07-31-car-commission-invoice-design.md` (facture de commission, autoliquidation), `2026-09-07-car-outcome-commission-design.md` (confirmation d'issue), plan `2026-07-29-car-rental-tunnel-voyageur.md` (paiement total, jamais armé)

## 1. Pourquoi

Relevé en base le 25/11/2026 [FACT 2026-11-25, `car_requests` et `car_quote_options`] :

| Année 2026 | Nombre |
|---|---|
| Demandes | 52 |
| Demandes avec au moins une offre | 45 |
| Première offre reçue, médiane | 6 minutes (31 des 36 non choisies en moins d'une heure) |
| Offres acceptées | 9 |
| Commissions encaissées | 2 (101,90 €) |
| Acceptations ressorties « non louées » (`lost`) | 7 |
| Demandes closes sans choix (`client_silent`, `rental_started`, `client_declined_all`) | 36 |

Deux constats en sortent :

1. **La vitesse n'est pas le problème.** Les loueurs répondent en quelques minutes. Les 36 clients partis sans choisir avaient des offres sous les yeux.
2. **L'encaissement est le problème.** Sur 9 offres acceptées, 2 commissions encaissées. Aujourd'hui, l'acceptation met client et loueur en relation par e-mail (`sendConnectionEmails`), puis on demande au loueur, après la location, s'il a loué. Une location faite en direct après la mise en relation ne nous rapporte rien et ne se voit pas : c'est « la fuite ».

Le plan saison 2027 (`project_crete_direct.md`, 25/11) place l'équilibre à 4 à 7 locations payées. Chaque location acceptée qui ne paie pas compte double.

## 2. Ce que veut François (décisions du 25/11/2026)

Prises par questionnaire dans la session du 25/11, toutes sur l'option recommandée :

1. **Modèle hybride.** Les loueurs qui donnent une grille de prix sont réservables directement au prix de la grille. La demande de devis reste en secours pour les loueurs sans grille et les cas hors grille.
2. **Acompte de 10 % en ligne, sans Stripe Connect.** Le client paie 10 % du prix au moment où il choisit une offre, sur le compte Stripe de NovAI. Il paie les 90 % restants au loueur à la prise du véhicule. Vaut pour **tous** les loueurs, offre de grille ou devis.
3. **Confirmation du loueur sous 4 heures**, comptées entre 8 h et 22 h, heure grecque. Sans confirmation, l'acompte est remboursé automatiquement et le client reçoit les autres offres.
4. **Grilles amorcées par Claude, corrigées par le loueur** depuis un lien privé, comme pour les devis aujourd'hui.
5. **Nature de l'acompte : une avance sur le prix de location, encaissée au nom du loueur.** Le mandat figure dans les conditions loueurs. NovAI garde l'avance en paiement de sa commission, qui reste facturée au loueur comme aujourd'hui (prestation intra-UE, autoliquidation, `src/lib/car-invoice.ts`). Pas de TVA grecque, pas de guichet unique OSS. Le loueur facture 100 % au client. ⛔ **Validation par le comptable avant la mise en service.**

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**

- Toute offre acceptée est payée à 10 % avant que le client et le loueur n'aient leurs coordonnées respectives.
- Pour une demande couverte par au moins une grille, le client voit des offres au prix réel dès l'envoi du formulaire, et un prix « à partir de » réel dès le choix de la catégorie.
- Le loueur confirme une réservation payée en un clic. Sans réponse dans le délai, personne ne garde l'argent du client.
- Les loueurs sans grille continuent de recevoir des demandes de devis.

**Non-objectifs**

- Paiement total en ligne, Stripe Connect, reversement aux loueurs.
- Disponibilité en temps réel ou stock déclaré par catégorie.
- Paiement en ligne des options (siège enfant, rachat de franchise) : elles sont affichées et réglées au comptoir.
- Âge du conducteur, nouvelles catégories, nouvelles langues.

**Anti-objectifs** (échec même si tout fonctionne techniquement)

- Un prix affiché que le loueur n'a pas validé lui-même. Une grille amorcée par Claude ne produit aucune offre tant que le loueur ne l'a pas publiée.
- Un client qui arrive au comptoir et paie plus que les 90 % annoncés, hors options choisies sur place.
- Un acompte gardé alors que la location n'a pas été confirmée.
- Un client qui a payé et ne sait pas, à chaque instant, si sa voiture est confirmée, en attente, ou s'il est remboursé.

## 4. Contraintes

- **Stripe** : compte NovAI unique (`stripeClient()` de `src/lib/stays/stripe-helpers.ts`), webhook commun `src/app/api/car-rental/commission/webhook/route.ts` discriminé par `metadata.payment_type`, registre `stripe_webhook_events` (scope `car`). Montant minimal 0,50 € (`STRIPE_MIN_CHARGE_EUR`). Les frais Stripe d'un paiement remboursé ne sont pas rendus : coût porté par NovAI.
- **Fiscal** : voir décision 5. Le client reçoit de crete.direct un reçu d'acompte, pas une facture NovAI. La facture de commission au loueur existe déjà (`car_commission_invoices`, numérotation `NOVAI-CD-AAAA-NNN`). Elle est émise au premier jour de location et marquée payée par compensation avec l'avance, sans demande de paiement.
- **Conditions loueurs** : la page `car-partner-terms` dit aujourd'hui « We do not sell, hold or cancel anything » et « the traveller pays you directly ». Elle doit être réécrite (section 9). Un loueur ne passe en grille publiée qu'après avoir accepté la nouvelle version.
- **Heures grecques** : fuseau `Europe/Athens`. Le seul assistant existant est `isPartnerNudgeHour` (8 h-21 h) dans `src/lib/car-quotes.ts`.
- **Langues** : pages client en en, fr, de, el. Pages et e-mails loueur en anglais, comme aujourd'hui (`/en/car-quote/{token}`).
- **Crons** : Vercel accepte déjà des crons horaires (`car-no-quote`, `car-partner-nudge`).
- **Déploiement** : `npm run ship` vers `master`, déploiement quotidien de 20 h. Tout part derrière un interrupteur éteint par défaut. L'allumer est un geste de François (argent réel).
- **Garde-fous existants à garder** : limite par IP, pot de miel, dédoublonnage 10 min, `SHORT_STAY_MIN_DAYS = 3`, `min_days` par loueur, téléphone obligatoire à l'acceptation, expiration d'une offre de devis à 72 h.

## 5. Approches considérées

| Approche | Ce que ça donne | Verdict |
|---|---|---|
| **A. Offres de grille dans le parcours existant** | À l'envoi du formulaire, les grilles produisent des offres sur la page d'offres actuelle (`/car-offer/{token}`), où le client arrive directement. Le prix « à partir de » de l'étape catégorie vient des grilles. Les devis de secours arrivent sur la même page. | **Retenue** (choix de Claude) |
| B. Parcours de réservation séparé | Prix et paiement avant toute saisie de coordonnées, sur des pages à part. Le parcours devis reste à côté. | Écartée : deux systèmes en parallèle, donc e-mails, admin, relances et indicateurs en double, pour un gain de vitesse que la mesure dément |
| C. Stock déclaré, réservation ferme immédiate | Chaque loueur tient un nombre de voitures libres par catégorie. | Écartée par François (confirmation sous 4 h retenue) |
| Paiement total via Connect | Tunnel de juillet, jamais armé. | Écartée par François (bloquant identité Stripe, compte Connect par loueur) |
| Frais de service facturés au client | 10 % en sus, TVA grecque via OSS, 8,06 % net. | Écartée par François (décision 5) |

## 6. Grilles de prix

### Données

Une grille appartient à un loueur et contient :

- **Des tarifs** : pour chaque catégorie (`city`, `compact`, `sedan`, `automatic`, `suv`, de `src/lib/car-types-data.ts`), chaque période datée (début, fin) et chaque palier de durée (à partir de N jours), un prix par jour en euros TTC. Des périodes datées plutôt que les 4 saisons fixes de `CAR_PRICE_GRID` : les loueurs publient leurs tarifs par dates, et l'amorçage doit pouvoir les recopier tels quels.
- **Des conditions communes** : modèle d'exemple et boîte par catégorie, inclusions (`src/lib/car-inclusions.ts`), assurance incluse et franchise (colonnes `default_*` existantes sur `car_partners`), prix du rachat de franchise par jour, caution bloquée au comptoir, frais de livraison par point de prise en charge (gratuit par défaut dans les zones du loueur), prix du siège enfant, conditions d'annulation du loueur en une ou deux lignes.
- **Un statut** : `draft` (amorcée, invisible), `live` (publiée par le loueur), `paused` (suspendue par le loueur ou par nous). Plus la date et la version des conditions acceptées.

Calcul du prix d'une demande : nombre de jours par `rentalDays()` existant. Le palier de durée est choisi sur le total de jours, et chaque jour est payé au tarif de la période qui le contient. Si un seul jour tombe hors de toute période, la grille ne couvre pas la demande. Prix total = somme des jours + frais de livraison du point choisi. Les options ne sont pas incluses.

Une grille dont la dernière période est passée ne produit plus rien. Un rappel part au loueur 30 jours avant la fin de sa dernière période.

### Amorçage par Claude

Sources : les 277 devis envoyés par les 10 loueurs actifs depuis juillet (prix, modèle, boîte, franchise, dates), puis les tarifs publics de leurs sites. Chaque valeur amorcée garde sa source (devis n°, URL) pour que le loueur sache d'où elle vient. Résultat : une grille `draft` par loueur.

### Correction et publication par le loueur

Lien privé par loueur (jeton haché, même mécanique que `car_quote_invites.quote_token_hash`), page `/en/car-rates/{token}` :

- Tableau éditable catégories × périodes × paliers, conditions communes en dessous.
- Bouton unique « Publish these prices », qui vaut acceptation des nouvelles conditions loueurs (version datée) et passage en `live`.
- Bouton « Fleet full until… » : suspend la grille jusqu'à une date. Proposition de Claude : c'est le levier le plus simple pour éviter les refus de confirmation en août.
- Une modification vaut pour les demandes suivantes. Une réservation déjà payée garde son prix (copie figée sur la demande, colonnes `quoted_*` existantes).

L'admin `/admin/car-rental` lit et modifie les grilles, avec la garde `isCarAdmin()` existante.

## 7. Parcours client

```
Étape 3, catégorie          Page d'offres, juste après l'envoi
┌──────────────────────┐    ┌──────────────────────────────────────────┐
│ Compacte             │    │ Zorbas Rent a Car       412 € pour 7 j   │
│ à partir de 47 €/j   │    │ 41,20 € aujourd'hui · 370,80 € au comptoir│
│ (prix des loueurs)   │    │ Confirmée sous 4 h, sinon remboursée     │
└──────────────────────┘    │ [ Réserver avec 41,20 € ]                │
                            ├──────────────────────────────────────────┤
                            │ 2 autres agences préparent un devis,     │
                            │ vous les recevrez par e-mail.            │
                            └──────────────────────────────────────────┘
```

1. **Étape catégorie** : chaque carte affiche « à partir de X € par jour », minimum des grilles publiées qui couvrent la zone, les dates et la catégorie. Sans grille, l'estimation actuelle (`CarPriceEstimate`) reste, présentée comme une estimation.
2. **Envoi du formulaire** : mêmes contrôles qu'aujourd'hui. Pour chaque loueur éligible :
   - grille publiée qui couvre la demande : une offre est créée tout de suite, marquée comme venant de la grille. Le loueur n'est pas prévenu à ce stade ;
   - sinon : demande de devis comme aujourd'hui.
   Le client est redirigé vers la page d'offres. Il reçoit aussi le lien par e-mail, comme aujourd'hui.
3. **Page d'offres** : les offres de grille et de devis s'affichent ensemble (`curateOffers` existant). Chaque offre montre le total, la part payée maintenant, la part au comptoir, l'assurance et la franchise, les conditions d'annulation du loueur, et « confirmée sous 4 h, sinon remboursée intégralement ».
4. **Choix d'une offre** (grille ou devis) : téléphone obligatoire comme aujourd'hui, puis paiement de l'acompte sur Stripe Checkout (10 % du total, au centime). Le verrou optimiste de `/api/car-rental/booking` est repris. `metadata.payment_type = car_deposit`. Aucune mise en relation à ce stade.
5. **Après paiement** : la page affiche « en attente de confirmation de {loueur}, au plus tard {heure} » et le client reçoit un e-mail qui dit la même chose.

Choix de Claude, à corriger si besoin :

- Les loueurs sans grille continuent de recevoir la demande de devis même quand des offres de grille existent. C'est le comportement d'aujourd'hui, et c'est ce qui pousse un loueur à donner sa grille.
- La confirmation sous 4 h s'applique aussi aux offres de devis : le devis peut dater de deux jours et la voiture n'être plus libre.
- L'acompte vaut le taux de commission du loueur (`car_partners.commission`), pas un 10 % codé en dur, pour que la compensation tombe toujours juste. Les 10 loueurs actifs sont à 0,10 [FACT 2026-11-25].
- L'heure de prise en charge est toujours connue : elle est obligatoire à l'étape 2 du formulaire.

## 8. Confirmation par le loueur

**Délai** : 4 heures d'ouverture comptées entre 8 h et 22 h, heure d'Athènes, à partir du paiement. Exemples :

| Paiement | Échéance |
|---|---|
| 10 h 00 | 14 h 00 le même jour |
| 21 h 30 | 11 h 30 le lendemain (30 min le soir + 3 h 30 dès 8 h) |
| 23 h 15 | 12 h 00 le lendemain |

Si l'échéance tombe moins de 2 heures avant la prise du véhicule, l'offre, de grille ou de devis, n'est pas réservable : elle s'affiche avec « trop proche du départ pour réserver en ligne » et aucune coordonnée n'est échangée (choix de Claude, pour ne pas rouvrir la fuite). Le client peut changer ses dates.

**Côté loueur** : e-mail immédiat avec dates, point de prise, catégorie, prix total et montant à encaisser au comptoir (90 %), et deux boutons « Confirm » et « Not available » (lien à jeton haché). Rappel à mi-délai. Alerte ops (`notifyOps`) à chaque réservation payée, pour qu'un humain puisse appeler le loueur.

**Confirmation** :

- Client : e-mail de réservation confirmée avec nom, adresse et téléphone du loueur, point et heure de prise, montant payé, montant dû au comptoir, conditions.
- Loueur : coordonnées du client.
- C'est seulement à ce moment que chacun reçoit les coordonnées de l'autre.

**Refus ou échéance dépassée** :

- Remboursement intégral de l'acompte (`refunds.create` sur le paiement, comme dans `booking/cancel`).
- Client : e-mail « {loueur} n'a pas pu confirmer, vous êtes remboursé intégralement », avec le lien vers ses autres offres encore valables. Il peut en choisir une autre et repayer.
- L'offre du loueur qui a refusé est grisée.

Un cron, au moins horaire, traite les échéances dépassées. Le webhook doit aussi traiter l'expiration d'une session de paiement jamais payée, pour libérer le verrou.

**Action ops** (choix de Claude) : depuis l'admin, ops peut confirmer, refuser ou prolonger l'échéance au nom du loueur. Sans cela, un loueur qui confirme par téléphone serait quand même remboursé par le cron.

**Loueur qui annule après confirmation, ou pas de voiture au comptoir** (choix de Claude) : remboursement intégral, avoir si la facture est déjà émise (`creditInvoice` existant), et cela compte dans la règle de suspension ci-dessous.

Proposition de Claude : trois refus, absences de réponse ou annulations côté loueur en 30 jours suspendent sa grille (`paused`), avec une alerte ops.

## 9. Conditions loueurs, nouvelle version

Points qui changent, pour les loueurs à grille publiée :

- Les prix publiés engagent le loueur pour toute réservation qu'il confirme.
- Mandat : crete.direct encaisse au nom du loueur une avance de 10 % du prix et la conserve en paiement de sa commission. La commission reste facturée au loueur, en autoliquidation, réglée par compensation avec l'avance.
- Le loueur encaisse les 90 % restants au comptoir et ne facture rien d'autre que les options choisies sur place.
- Le loueur confirme ou refuse sous 4 heures d'ouverture. Sans réponse, la réservation est libérée et le client remboursé.
- Facturer au comptoir plus que le prix confirmé exclut le loueur.

L'acceptation est enregistrée (version, date). Choix de Claude, pour tenir la décision 2 (acompte pour tous) :

- **Tout loueur, à grille ou non, accepte les nouvelles conditions avant d'être réservable.** Loueur à grille : par « Publish these prices ». Loueur à devis seulement : une case à cocher, une fois, sur le formulaire de devis.
- **L'identité de facturation complète** (raison sociale, adresse, numéro de TVA, déjà exigée par `partnerBillingIdentity`) est demandée au même moment. Sans elle, l'acceptation est impossible, car NovAI garderait un acompte qu'elle ne peut pas facturer. 8 des 10 loueurs actifs l'ont déjà ; il manque Auto Smart et Greenways [FACT 2026-11-25].
- **Interrupteur allumé** : un loueur qui n'a pas accepté ne reçoit plus de demandes. Une demande acceptée avant l'allumage finit dans l'ancien parcours (mise en relation, relance d'issue).
- Les loueurs en routage `relay` (relais WhatsApp par Kami) n'ont pas de lien pour confirmer : ils sortent du parcours. Aucun des 10 actifs n'est en `relay` [FACT 2026-11-25].
- Un prix modifié au comptoir (location raccourcie ou prolongée) ne change pas la commission : elle porte sur le prix confirmé.

## 10. Ce que devient l'existant

| Existant | Devient |
|---|---|
| `startBookingAfterAccept`, point d'appel dans `/api/car-rental/accept` | Point d'entrée de l'acompte |
| Paiement total : `bookingBreakdownCents`, `car-transfers`, onboarding Connect voiture, option d'annulation à 5 € | Supprimés en fin de chantier, une fois l'acompte testé (choix de Claude : un seul chemin de paiement dans le code) |
| `sendConnectionEmails` à l'acceptation | Remplacé par la mise en relation à la confirmation |
| Relance d'issue (`car-outcome-followup`) et demande de paiement de commission | Gardées pour les acceptations sans acompte antérieures à la mise en service. Plus rien de neuf n'y entre |
| `car_commission_invoices` | Facture émise au premier jour de location, marquée payée par compensation |
| `CAR_PRICE_GRID` (estimation de marché) | Gardée seulement quand aucune grille ne couvre |

## 11. Annulation par le client

**Décision de François (25/11/2026) : annulation gratuite jusqu'à 48 h avant la prise.**

- Le client annule au moins 48 h avant l'heure de prise : acompte remboursé intégralement, pas de facture de commission.
- Il annule moins de 48 h avant, ou ne se présente pas : l'acompte est gardé comme commission et facturé au loueur au premier jour, comme une location effectuée.
- La règle s'affiche sur chaque offre, sur la page de paiement et dans l'e-mail de confirmation.

Conséquences, choix de Claude :

- Le client annule par un lien dans son e-mail de confirmation : reprise du modèle `booking/cancel` et `CancelPanel`. Le seuil reprend `REFUND_WINDOW_HOURS = 48`, sans l'option à 5 €. Le loueur est prévenu de l'annulation.
- La facture de commission part au premier jour sans demander d'issue au loueur. Dans tous les cas où l'acompte reste gardé, il y a commission.
- Un loueur sans voiture au comptoir : le client le signale à crete.direct en répondant à l'e-mail de confirmation, et ops rembourse depuis l'admin. Avoir si la facture est déjà émise.
- La politique de juillet (`booking-policy.ts` : rien de remboursé sans l'option à 5 €) visait le paiement total et disparaît avec lui.

## 12. Mesure

Indicateurs ajoutés à la bande KPI de l'admin :

- Part des demandes avec au moins une offre de grille.
- Taux de passage de l'offre à l'acompte payé.
- Taux de confirmation, délai médian de confirmation.
- Nombre de remboursements, par motif.
- Commission encaissée.

Événements Plausible : `car_deposit_paid`, `car_booking_confirmed`, `car_deposit_refunded`, sur le modèle de `Car Lead`.

## 13. Mise en service

1. Code livré derrière `CAR_CATALOGUE_ENABLED`, éteint.
2. Grilles amorcées en `draft` pour les 10 loueurs actifs.
3. Courrier aux 10 loueurs : grille à vérifier, nouvelles conditions. Texte validé par François, signé Kami, envoyé par `send-crete-direct.mjs`.
4. ⛔ Validation comptable de la décision 5, y compris le cas de l'acompte gardé sur une annulation tardive (section 11). Le code se construit sans attendre, derrière l'interrupteur. Si le comptable refuse, le paiement reste et seuls changent le reçu, la compensation et le texte des conditions : ces trois parties vivent dans un module isolé (choix de Claude).
5. Parcours complet en mode test Stripe, puis un paiement réel remboursé.
6. Allumage par François. Cible : au moins 5 grilles publiées et interrupteur allumé avant le 01/04/2027.

## 14. Laissé au constructeur

Noms des tables et colonnes, forme des migrations, fréquence exacte du cron d'échéance dans les limites Vercel, mise en page des écrans dans le style de la page d'offres actuelle, textes des e-mails (relus par François avant tout envoi réel), découpage des tâches.
