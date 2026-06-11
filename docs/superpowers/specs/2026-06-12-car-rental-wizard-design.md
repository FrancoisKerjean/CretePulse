# Spec — /car-rental : wizard lead-gen location de voiture (partenaire Auto Smart, 10 %)

Date : 2026-06-12 · Validé par Kami en session (brainstorming 11/06 soir + fil Gmail vérifié)

## Contexte et objectif

Partenariat ACTÉ par email le 12/05/2026 avec **Auto Smart Car Rental** (Panagoula Spiliotopoulou, Chania, chaniacarrental.gr) : **10 % de commission sur les clients apportés par Kami**. Process convenu par email : Kami (pas le client) transmet chaque demande avec **heures d'arrivée/départ, type de voiture, nombre de personnes, dates**. L'agence travaille aussi en espèces → AUCUN paiement en ligne : le wizard est un outil de lead-gen, l'agence ferme la vente.

Le tracking des 10 % repose sur la transmission : **chaque lead = un email horodaté envoyé par nous avec copie à contact@kairosguest.com** = preuve d'apport. Plus un compteur DB + rapport mensuel.

## Décisions prises (Kami)

1. Page dédiée `/car-rental` (SEO "rent a car crete") + encarts d'appel sur /airport, /getting-around, /near-me, paires bus sans liaison directe.
2. Wizard à grosses cartes cliquables, zéro champ texte avant l'étape contact. Véhicules représentés par des **icônes maison** (langage grille 24 / trait 1.75 / ADN minoen, comme CiFerry), PAS de photos de modèles.
3. Lead routé par **email Resend à l'agence + copie contact@kairosguest.com**. Pas de WhatsApp automatique (le bridge reste hors flux).

## Architecture

### 1. Zones multi-partenaires `src/data/car-partners.json` + `src/lib/car-partners.ts`
Pattern identique à taxi-partners : zones exclusives, lookup pur.
```json
{ "zones": [
  { "id": "chania-west", "label": "Chania & West", "pickups": ["chania-airport", "chania", "kissamos", "palaiochora"] },
  { "id": "rethymno", "pickups": ["rethymno", "plakias"] },
  { "id": "heraklion-center", "pickups": ["heraklion-airport", "heraklion", "matala", "hersonissos", "malia"] },
  { "id": "lasithi-east", "pickups": ["agios-nikolaos", "elounda", "sitia", "ierapetra", "makrigialos"] }
],
"partners": [
  { "zoneIds": ["chania-west"], "name": "Auto Smart Car Rental", "email": "autosmartrental@gmail.com",
    "phone": "+306974147291", "website": "https://chaniacarrental.gr", "commission": 0.10, "since": "2026-05-12" }
] }
```
- Slugs pickups = sous-ensemble de SLUG_COORDS (coords déjà connues).
- Zone sans partenaire → le wizard affiche les pickups mais à l'étape finale : "pas encore de partenaire dans cette zone" + lien /partners (slot vendable) + suggestion de la zone couverte la plus proche. AUCUN lead envoyé pour une zone sans partenaire.
- ⚠️ Couverture réelle d'Auto Smart hors Chania non confirmée (question posée à Panagoula, owner Kami butoir 19/06). Au lancement : seule `chania-west` a un partenaire ; étendre = éditer le JSON.

### 2. Icônes véhicules dans `src/components/icons.tsx`
Nouvelles icônes langage maison : `CiCarCity` (citadine), `CiCarCompact`, `CiCarSuv`, `CiCarFamily` (7 places), `CiCarCabrio`, `CiScooter`. Types proposés au wizard pilotés par une constante `CAR_TYPES` (id, icône, labels 4 langues, pax indicatif) — la flotte réelle d'Auto Smart affinera la liste (info attendue de Panagoula ; en attendant : city/compact/SUV/family/cabrio).

### 3. Page `/[locale]/car-rental` + wizard
- `page.tsx` server : metadata 4 langues, buildAlternates, generateStaticParams, FAQPage + Service JSON-LD, contenu éditorial SEO autour du wizard (conduire en Crète : permis, assurance, routes de montagne, parkings — rédigé honnête, 4 langues) + bloc transparence partenaire ("local partner, clearly labelled, you pay the agency directly, cash accepted").
- `src/components/car-rental/CarRentalWizard.tsx` client, 4 étapes, barre de progression, mobile-first :
  1. **Où ?** Cartes des pickups groupés par zone (icônes CiPlane pour aéroports, CiMark villes) ; option "près de moi" (réutilise useGeoPosition de la spec near-me → pré-sélectionne le pickup le plus proche).
  2. **Quand ?** Date + heure de prise, date + heure de retour (heure = exigence explicite de Panagoula "arrival and departure time"). Champ optionnel n° de vol. Défauts : demain → +7 jours.
  3. **Quoi ?** Cartes types de véhicules (icônes maison) + sélecteur passagers (1-7+).
  4. **Qui ?** Prénom, email (requis), téléphone/WhatsApp (optionnel), note libre (optionnel). Honeypot + consentement transmission ("tes coordonnées sont transmises à l'agence partenaire pour te répondre" — RGPD, transmission = la finalité affichée).
- Confirmation : "Demande transmise à <agence>. Réponse directe avec un devis, paiement sur place possible, aucun prépaiement." + récap.

### 4. API `POST /api/car-rental/submit`
Pattern de `/api/newsletter/subscribe` (validation, honeypot, rate-limit IP 5 min) :
1. Valider payload (zone AVEC partenaire obligatoire, dates cohérentes, email valide).
2. Insert `car_requests` (Postgres VPS via supabaseAdmin) : id, created_at, locale, pickup_slug, zone_id, partner_name, dates/heures, flight_no, car_type, pax, name, email, phone, note, status='sent'.
3. Email Resend FROM `Crete Direct <hello@crete.direct>` TO partenaire, **CC contact@kairosguest.com** (la preuve des 10 %), reply-to email du client. Sujet : `New rental request — <pickup> <date-from> → <date-to> (<car type>, <pax> pax)`. Corps EN structuré exactement sur les champs demandés par Panagoula + rappel discret "referred by Kami — crete.direct (10% partnership)".
4. Échec email → status='email_failed' en DB + retour ok:false (le front propose le WhatsApp de l'agence en secours). Échec DB mais email parti → on n'annule pas, log Sentry.
5. Front : event Plausible `Car Lead` (props: zone, pickup, carType, source page).
- Migration SQL : table `car_requests` + grants (INSERT service role uniquement, pas de SELECT anon), à appliquer sur le Postgres VPS (`/opt/cretepulse-db`).

### 5. Encarts + maillage
- `PromoBox` (composant existant) sur : pages /airport (3), /getting-around, /near-me (section dédiée), pages paires bus SANS liaison directe trouvée + planner résultat "no-route". CTA → `/car-rental?pickup=<slug-contextuel>`.
- Le wizard lit `?pickup=` pour sauter l'étape 1.
- Remplacement du placeholder affilié DiscoverCars par l'encart partenaire sur les emplacements en zone couverte ; hors zone couverte, DiscoverCars placeholder reste (rien à perdre).
- Sitemap : `/car-rental` dans STATIC_PAGES. Nav : entrée sous l'univers "Plan".

### 6. Rapport mensuel + réconciliation
- Étendre `vps/partner_report.py` (cron existant 1er du mois) : section car rental = nb de leads transmis (`car_requests` du mois, via PostgREST service) + clics outbound vers chaniacarrental.gr (Plausible) → email au partenaire + copie contact@. Base de réconciliation des 10 %.

## Erreurs et limites
- Zone sans partenaire → pas d'envoi, CTA /partners (jamais d'email dans le vide).
- Rate-limit + honeypot contre le spam (l'email part chez une vraie personne).
- Double soumission : bouton disabled pendant l'envoi + dédup côté API (même email + mêmes dates + même pickup dans les 10 min → 200 sans renvoyer).

## Tests
- `car-partners.ts` : lookup zone par pickup, zone sans partenaire, pickup inconnu.
- API : payload valide → insert + email mockés ; zone sans partenaire → 400 ; honeypot rempli → 200 silencieux sans envoi ; dédup 10 min.
- Playwright : parcours complet 4 étapes FR + EN (mock API), `?pickup=chania-airport` saute l'étape 1, zone est → message slot disponible sans envoi.

## Dépendances ouvertes (owner Kami, butoir 19/06/2026)
- Prévenir Panagoula (WhatsApp) : format automatique + volume crete.direct ; demander couverture hors Chania + flotte réelle (types). Le build ne bloque pas dessus : lancement zone chania-west seule, types génériques.
