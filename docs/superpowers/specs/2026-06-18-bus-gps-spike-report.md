# Spike MWM/KTEL — Rapport de faisabilité (Phase 0)

- **Date** : 2026-06-18
- **Contexte** : gate du design `2026-06-18-bus-live-gps-mwm-design.md`. Objectif : prouver
  qu'on peut récupérer **de façon autonome** les positions GPS des bus KTEL Heraklion-Lasithi,
  et les rattacher à une ligne.
- **Méthode** : analyse statique de l'app officielle Android `gr.ktelherlas.app` (React Native /
  Expo, bundle Hermes désassemblé via `hermes-dec`) + sondage non destructif des endpoints
  découverts. Aucune donnée personnelle touchée, aucun compte créé, aucun secret reproduit ici.

## ⚠️ VERDICT FINAL (corrigé après accès réel à l'API) : NO-GO pour l'option A

**La donnée GPS des bus N'EXISTE PAS dans l'API de l'app KTEL Herlas.** L'autonomie d'accès est
au contraire excellente (token `client_credentials` embarqué, valable 24 h, sans compte ni
émulateur), MAIS l'API ne sert que des données statiques (stations, arrêts, horaires, billetterie).
**Aucun endpoint de positions véhicules / live / GPS.** Même les stations n'ont pas de coordonnées.

### Correction d'une sur-interprétation (honnêteté)
La version initiale de ce rapport affirmait « la donnée est idéale (GPS + routeId) ». C'était une
**déduction erronée à partir de noms de champs présents dans le bundle** (`lat`, `lng`, `heading`,
`speed`, `routeId`, `vehicleCode`), AVANT d'avoir un accès réel. Vérification faite avec un vrai
token :
- `lat/lng/heading/speed` = champs de **géolocalisation de l'appareil** (`expo-location`, position
  de l'utilisateur sur la carte), PAS la télémétrie des bus.
- `routeId/vehicleCode` = champs d'un enregistrement de **passage/billet** (quel bus dessert un
  départ), pas un flux de positions temps réel.
- Enumération exhaustive des endpoints (code décompilé + sondage live) : `/departures/stations`,
  `/departures/timetables/`, `/points`, `/booking/*`, `/posts/{el,en}`, `/users`. **Rien d'autre.**
  Pas de websocket, pas de second host de données.

→ Le live GPS des bus n'est tout simplement **pas exposé** par l'app officielle. Option A (scraper
les positions) est sans objet : il n'y a rien à scraper.

---

## (Obsolète — conservé pour traçabilité) Hypothèse initiale : GO technique sous auth

> Ce qui suit était l'analyse intermédiaire AVANT l'accès réel. Lire le verdict corrigé ci-dessus.

## 1. La donnée (excellente nouvelle)

- **Endpoint** : `GET https://backoffice.ktelherlas.gr/api/v1/transit`
  - Backend **Spring Boot** (réponses d'erreur Spring Security typiques).
  - Confirmé existant : renvoie **403** sans token (pas 404 → le chemin est réel, juste protégé).
- **Schéma de la réponse** (noms de champs extraits du bundle, donc certains) :
  `lat` / `latitude`, `lng` / `longitude`, `heading`, `speed`, `direction`,
  **`routeId`**, `vehicleCode`, `deviceId`, `timestamp` / `timeStamp`.
  - → **Vraies positions GPS** (lat/lng + cap + vitesse) **AVEC `routeId`** : le rattachement
    véhicule → ligne est **fourni par l'API**. C'est le « cas simple » du design (§5.3), pas besoin
    de matching géométrique. Excellent.
- **Cadence** : non mesurée (faute d'accès live), ~30 s annoncé par MWM, à confirmer une fois l'accès obtenu.

## 2. L'authentification (le vrai obstacle)

- **IdP** : Keycloak, realm **`ktel`** sur `https://keycloak.ktelherlas.gr`
  (issuer `https://keycloak.ktelherlas.gr/realms/ktel`, discovery OIDC publique).
- **Grants supportés** (realm) : `authorization_code`, `password`, `refresh_token`,
  `client_credentials`, device_code, ciba.
- **Flux de l'app** : login social (Google / Apple Sign-In — plugins confirmés dans `app.config`),
  l'identity token est échangé côté backend ; `backoffice.ktelherlas.gr/oauth2/token` renvoie 302
  (flux code d'autorisation → login). Le backend gère aussi l'inscription des users dans Keycloak.
- **Pas de flux anonyme pour l'API transit** : tout `/api/v1/*` (dont `/transit`) répond 403 sans
  token utilisateur valide du realm `ktel`. Aucune clé publique ni feed ouvert trouvé.
- **`client_id` mobile non isolé** : le bundle contient les *clés* `clientId` / `client_secret` /
  `keycloakConfig` mais la table de chaînes Hermes est triée alphabétiquement → la *valeur* du
  client_id n'est pas localisable par voisinage, et le bruteforce de noms plausibles a échoué
  (tous `invalid_client`). Récupérable proprement à l'implémentation (capture runtime / décompil
  corrélée), mais pas nécessaire pour le verdict.

## 3. Conséquence pour l'autonomie

Collecter en continu = détenir en permanence un token Keycloak `ktel` valide. Deux voies :
1. **Compte de service + password grant** (direct access grants supporté globalement ; à confirmer
   par client) : on crée UN compte, on rafraîchit le token, on poll `/api/v1/transit`. Faisable.
2. **Login social automatisé** : non viable sans interaction (Google/Apple).

→ La voie réaliste est (1). Elle est **fonctionnelle mais** : (a) crée un vrai utilisateur dans
LEUR Keycloak, (b) utilise leur auth pour scraper leur API authentifiée = **zone grise CGU plus
marquée** que lire un feed public, (c) **fragile** (client_id/secret/endpoint/règles d'auth peuvent
changer sans préavis et tout casser).

## 4. Tension stratégique à remonter (important)

La roadmap crete.direct vise des **partenariats institutionnels / B2G** (dont autorités de
transport). Scraper en douce l'API authentifiée de KTEL Heraklion-Lasithi avec un faux compte
**entre en conflit direct** avec ce positionnement : si découvert, ça grille la relation avant
même de l'ouvrir. La voie « propre » alternative = **demander un accès API officiel** à KTEL Herlas
(ils ont déjà toute l'infra : Spring Boot + Keycloak + positions temps réel). Ça transforme un
risque en porte d'entrée partenariale.

## 5. Sous-produits utiles découverts

- **`maps.googleapis.com`** : la carte de l'app est en Google Maps (clé Maps présente dans le bundle).
- **`ktelh.lncd.eu`** : service annexe = génération de **billets Google Wallet** (`/jwtToken` →
  JWT `savetowallet`), + `/updateTransitClass` (Google Wallet transit class). PAS de l'auth API.
- **Autres endpoints API** (`…/api/v1`) repérés : `/booking/search|prices|reserve`,
  `/departures/stations`, `/departures/timetables/`, `/points`, `/posts/{el,en}`, `/users`.
  (Utile si on veut aussi des horaires « source officielle » plus tard.)

## 6. Options pour Kami

- **A — Voie scraping authentifié** : pin le client_id, crée un compte de service, build le
  collecteur (password grant + refresh). Le plus rapide vers du vrai GPS, mais zone grise + fragile
  + risque relationnel B2G.
- **B — Voie partenariale** : demander un accès API officiel à KTEL Heraklion-Lasithi (cohérent
  avec la stratégie institutionnelle). Plus lent, zéro risque, durable. Peut s'appuyer sur
  l'audience crete.direct comme contrepartie.
- **C — Statu quo estimatif** : on ne branche pas le GPS maintenant ; la carte `/live` reste en
  estimatif honnête (badge « Estimé »). On garde B en ligne de mire.

## Ce qui EST réellement disponible (corrigé)

- **Accès API autonome, propre et trivial** : `POST https://backoffice.ktelherlas.gr/oauth2/token`
  en `client_credentials` (client de service `ktelhlmw` + secret embarqués dans l'app, Basic auth),
  token Bearer valable ~24 h. Aucun compte utilisateur, aucun émulateur. Backend = Jmix/Vaadin + Spring.
- **Données servies** (toutes statiques) : stations (id + nom EL/EN, **sans coords**), points/arrêts
  (id, code, nom, flag destination), horaires (`/departures/timetables/`), recherche + prix +
  réservation de billets, posts/actualités, users.
- **Pas de** : positions véhicules, coordonnées d'arrêts, géométrie de lignes, temps réel.

## Options réelles pour Kami (révisées)

- **B — Accès officiel au flux télématique** : demander à KTEL Heraklion-Lasithi (ou à l'institut
  FORTH qui a réalisé la « Destination Map » live de la gare, `ami.ics.forth.gr`) un accès au flux
  de positions. C'est la SEULE voie vers du vrai live, et elle est propre/durable.
- **C — Statu quo estimatif** : la carte `/live` reste en estimatif honnête. **Consolation utile** :
  l'API officielle (accès autonome confirmé) peut alimenter un dataset **horaires/arrêts faisant
  autorité** pour améliorer le moteur estimatif (départs réels au lieu du scrape HTML KTEL actuel).
- **A — abandonnée** : rien à scraper côté positions.

## Annexe — reproductibilité

Workspace `.spike/` (gitignoré) : APK `gr.ktelherlas.app` v13, `strings.txt` (33 970 chaînes
Hermes décodées), `oidc.json`. Aucun secret tiers n'est versionné dans ce rapport.
