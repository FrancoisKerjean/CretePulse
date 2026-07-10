# Spec — crete.direct app compagnon de séjour

Date : 2026-07-10 · Statut : validée Kami (mockups GO) · Mockups : `docs/mockups/2026-07-10-app-companion-mockups.html`

## Vision

crete.direct devient le compagnon de séjour temps réel de la Crète. Le site reste la machine
d'acquisition (SEO 24K pages, Facebook, ChatGPT) ; l'expérience app-like (carte, bus GPS,
conditions plages) devient le produit de rétention pendant le séjour (7-14 jours) ; CRD et
Activities sont la monétisation branchée dessus. Pas de réécriture : le codebase Next.js EST
l'app (PWA d'abord, coquille TWA Play Store ensuite, iOS Capacitor conditionnel).

## Données fondatrices (Plausible ClickHouse, 30j au 10/07/2026, site_id=1)

- buses : 4 050 visiteurs, 76 % mobile, sources diversifiées (FB 1 140, direct 1 035,
  **chatgpt.com 607**, Google 572). `bus_search` : 876 users actifs, 2 089 recherches.
- /explore : 3 013 visiteurs sur une page, 86 % mobile, **73 % Facebook** (destination sociale).
- beaches : 775 visiteurs, meilleur engagement (2,79 pv/vis), 70 % mobile.
- news : 9 650 visiteurs hit-and-run (1,23 pv/vis), majoritairement Discover grec — hors produit.
- Retour intra-jour features outils : 4,7-5,5 %. **Rétention multi-jours : non mesurable**
  (sel Plausible 24h) → le lot 0 l'instrumente.
- Stores : app KTEL officielle depuis 2024 (horaires interurbains seuls) ; app tierce notée 1,0/5
  abandonnée ; Crete Unlocked ~25K voyageurs/an → le marché « compagnon Crète » existe,
  personne n'a le temps réel.

## Décisions actées (Kami, 10/07/2026)

1. Pas d'app native ni de codebase séparé. PWA sur le site existant, stores en wrapper.
2. Objectif premier : rétention pendant le séjour (la monétisation en profite mécaniquement).
3. /explore = shell de l'app (LA carte unique du site depuis le kill /map du 09/07).
4. Mesure d'abord : le lot 0 tourne pendant le dev ; la décision stores (lots 3-5) se prend
   sur ses chiffres après ~3 semaines de pleine saison.
5. DA : Kalimera (Baloo 2 + Geist, lagoon/sea/ink/sun) ; icône app = chèvre kri-kri.

## Critères GO/NO-GO stores (mesurés par le lot 0)

GO lots 3-5 si, sur ~3 semaines de saison : retour J+1 ≥ 8 % des visiteurs mobiles des
features outils (buses/explore/beaches/live), OU clic bannière install ≥ 3 % des mobiles
exposés. Sinon : retravailler le hook produit web avant tout investissement store.

## Les 4 écrans (validés en mockup)

1. **Maintenant** (/explore en écran d'accueil) : carte plein écran, géoloc, pins plages avec
   score baignade live, bus GPS en approche, chips filtres (Plages/Bus/Manger/Voir), panneau
   bas « Maintenant, près de toi » (meilleure plage + prochain bus), tab bar Carte/Bus/Plages/Devis.
2. **Bus en direct** : arrivées par arrêt avec distinction ETA GPS réel (vert « en direct ») vs
   horaire théorique, mini-carte bus en approche, accès planner, horaires hors-ligne.
3. **La plage, en vrai** : conditions live (mer/vent/vagues), jauge affluence + conseil horaire,
   alternative plus calme proche, CTA « y aller en bus » + « louer une voiture · devis ».
4. **Install + push** : bannière install APRÈS interaction réussie (jamais à l'arrivée), icône
   chèvre, push « ton bus passe dans X min » / « mer calme à Voulisma ce matin ».

## Plan en lots

| Lot | Contenu | Effort | Notes |
|---|---|---|---|
| 0 · Mesure | Compteur rétention localStorage → props Plausible (`visit_number`, `days_since_first`) + events bannière install (`install_banner_shown/click`, `appinstalled`) | 1,5 j | Tourne pendant le dev ; RGPD-clean : aucun identifiant transmis, compteur local anonyme |
| 1 · PWA socle | Manifest, service worker, offline horaires bus, prompt install contextuel | 3-4 j | Rend le site installable ; socle des 3 plateformes |
| 2 · Shell Maintenant | /explore app-shell : géoloc, panneau near-me temps réel, tab bar mobile | ~1 sem | La boucle quotidienne |
| 3 · Play Store | TWA via PWABuilder, assetlinks.json, fiche store | 1 j + 25$ | Conditionnel lot 0 |
| 4 · Push | Web push (Android + iOS 16.4+ installée) : bus proche, plage calme matin | 3-4 j | Levier rétention max |
| 5 · App Store iOS | Wrapper Capacitor + ponts natifs (géoloc, push, offline) pour review 4.2 | ~1 sem + 99$/an | Uniquement si lots 0-4 prouvent l'usage |

Les lots 0-1-2 ont une valeur autonome même si l'app ne décolle pas : mesure, offline,
meilleure UX mobile pour ~3 000 mobinautes/mois sur /explore.

## Contraintes techniques connues

- Vercel : `main` = Production, `master` = Preview (déployer prod = push `<branche>:main`).
- Preview sans `SUPABASE_SERVICE_KEY` (mode dégradé connu) ; REVALIDATE_SECRET absent (dette 16/07).
- Privacy policy « we do not track » (4 langues) : le lot 0 ne doit transmettre AUCUN identifiant ;
  props agrégées Plausible uniquement. Pas de consent banner nécessaire.
- Service worker : attention au cache des pages ISR/i18n 22 locales — scoper l'offline aux
  données bus (horaires JSON) et au shell, pas au contenu éditorial.
- Push : nécessite un service de souscriptions (endpoint + VAPID) côté VPS ou Vercel — à cadrer
  au lot 4, hors scope lots 0-2.

## Hors scope

- Réécriture native (Swift/Kotlin/React Native), app séparée.
- Compte utilisateur / login (le compagnon marche sans identité).
- Refonte du contenu éditorial ou de news.
- Notifications marketing (push = utilité séjour uniquement).
