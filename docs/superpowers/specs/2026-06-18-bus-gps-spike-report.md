# Spike MWM/KTEL — Rapport de faisabilité (Phase 0)

- **Date** : 2026-06-18
- **Contexte** : gate du design `2026-06-18-bus-live-gps-mwm-design.md`. Objectif : prouver
  qu'on peut récupérer **de façon autonome** les positions GPS des bus KTEL Heraklion-Lasithi,
  et les rattacher à une ligne.
- **Méthode** : analyse statique de l'app officielle Android `gr.ktelherlas.app` (React Native /
  Expo, bundle Hermes désassemblé via `hermes-dec`) + sondage non destructif des endpoints
  découverts. Aucune donnée personnelle touchée, aucun compte créé, aucun secret reproduit ici.

## Verdict : GO **technique**, mais accès **authentifié** (pas de flux anonyme) → décision Kami

La donnée existe et elle est **idéale**. L'obstacle n'est pas la donnée, c'est l'**authentification** :
elle exige un token utilisateur Keycloak, donc l'autonomie passe par un **compte de service dédié**
(zone grise CGU + fragilité). Ce n'est plus une question technique mais une décision de risque/relation.

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

## Annexe — reproductibilité

Workspace `.spike/` (gitignoré) : APK `gr.ktelherlas.app` v13, `strings.txt` (33 970 chaînes
Hermes décodées), `oidc.json`. Aucun secret tiers n'est versionné dans ce rapport.
