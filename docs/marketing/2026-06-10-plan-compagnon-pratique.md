# Plan de développement 90 jours — crete.direct, le compagnon pratique de la Crète

**Auteur** : Hélène Vasilakis, direction marketing Kairos, 10/06/2026
**Décision de cadrage (Kami, 10/06)** : ambition = premier média touristique de Crète. Positionnement opérationnel retenu : **le compagnon pratique de la Crète, données live**. La couronne "premier média" est l'ambition de résultat, mesurée, pas le positionnement éditorial.

## Faits fondateurs (10/06/2026, sources primaires)

- ~74% du trafic = pages /buses, en 7+ langues (ClickHouse Plausible, 462 pv depuis le 07/06)
- Le trafic bus vient majoritairement de Facebook (324 pv) et du direct, pas de Google : comportement d'utilitaire partagé entre touristes
- chatgpt.com = 4e source référée (53 pv) : l'AEO fonctionne déjà
- Google atterrit sur : news chaude FR (requins, 32 pv), bus (18), plages précises (7)
- Baseline GSC : 52 clics/28j (14/05). Snapshot J+30 : 12/06/2026
- Les 5 liens affiliés sont des placeholders = 0 € sur tout clic sortant
- Asset data non copiable : KTEL 220 lignes, HCAA 26 mois, Inside Airbnb 64,7K listings, météo/mer live, 500+ plages géolocalisées

## Principe directeur

**Test de toute feature : "remplace-t-elle un PDF illisible / une information mal servie, pour une décision concrète du touriste ?"** Si non, pas prioritaire. Contrainte invariante : 100% automatique après construction (zéro ops récurrent Kami).

## Vague 1 — Prouver le pattern (semaines 1-2, jalon 24/06)

| Chantier | Owner | Détail |
|---|---|---|
| **Beach finder "Où se baigner aujourd'hui"** | Claude | Croisement direction du vent live × orientation côte des 500+ plages. Page `/where-to-swim-today` 4 langues + hreflang, ISR court (3-6h), cross-links massifs vers les 217 pages plages. Partage pensé (OG dynamique, titre datée). |
| **Page `/ferries`** | Claude | Horaires/lignes au départ de Crète, pattern bus. Affiliate FerryHopper natif = première page qui monétise. Préalable : ID FerryHopper réel. |
| Inscriptions 5 programmes affiliés | **Kami** | Booking, GetYourGuide, DiscoverCars, FerryHopper, Skyscanner. Je remplace les 5 chaînes dans `affiliates.ts` à réception. |
| OAuth GSC + goals Plausible + OAuth Insta | **Kami** | 3 × ~10 min. GSC avant le 12/06 idéalement (snapshot J+30). |

**Ajout 10/06 (idée Kami validée)** : **comparatif bus vs taxi sur les pages /buses + slot "partenaire taxi" vendu en direct** aux opérateurs locaux. Tarifs fixes officiels publiés (utile au lecteur), emplacement sponsorisé étiqueté, preuve de valeur par Plausible (events clic tel:). Récurrent mensuel en vente directe, prix à valider au premier rendez-vous (pas de tarif inventé). Synergie NovAI : taxis/transferts Crète est = cible exacte, slot pub = porte d'entrée vers le site 599€. Garde-fous : étiquette "sponsorisé" visible, mise à jour honnête du footer "No ads (yet)" au premier signé. Build Claude, vente Kami.

**KPI vague 1** : beach finder dans le top 5 Plausible à J+14 de son lancement ; ferries live avec ID réel ; premiers € affiliés trackés ; 1er rendez-vous taxi pitché avec les chiffres Plausible.

## Vague 2 — Élargir l'utilitaire (semaines 3-6, jalon 22/07)

- **Calculateur "Best time to visit Crete"** + 12 pages `/when/[month]` : affluence réelle (pax HCAA), prix Airbnb par mois, météo/mer historique. Format réponse chiffrée = candidat citation ChatGPT/Perplexity.
- **Transferts aéroport musclés** : getting-around étendu (toutes les liaisons aéroport→stations balnéaires majeures, prix taxi vs bus, pattern bus).
- **Amplification du canal Facebook sans canal manuel** : OG images dynamiques soignées sur toutes les pages utilitaires + boutons de partage (les touristes font la distribution).
- **AEO systématisé** : FAQ + réponses datées/chiffrées sur chaque page utilitaire, llms.txt enrichi. Mesure mensuelle des citations IA (méthode NovAI).
- **Traduction 22 langues du daily content** si le snapshot GSC valide l'indexation EN (condition posée Phase 3).
- **Ajout 10/06 (idée Kami validée)** : **vidéos explicatives bus/transport par langue** (pipeline Remotion + TTS existant, one-shot evergreen). Distribution : embed sur les pages /buses (elles circulent déjà dans les groupes Facebook : la vidéo voyage avec), YouTube @CreteDirect, page FB Crete Direct. PAS de posting automatisé dans les groupes FB (règles Meta + canal manuel refusé). Voix en/fr/de, sous-titres no/da/ar/sv/it (langues réelles du trafic bus).

**KPI vague 2** : ≥150 clics GSC/28j (×3 baseline) ; ≥100 pv/mois référés IA ; pages utilitaires = ≥60% du trafic.

## Vague 3 — Autorité (semaines 7-12, jalon 10/09)

- **Rapport trimestriel "Crete Tourism in Numbers"** auto-généré (HCAA + Inside Airbnb + Eurostat, scripts data-drop existants) : page citable + PDF. Cible : presse voyage, newsletters, blogs grecs. C'est l'aimant à backlinks qui muscle tout le domaine.
- **Page About/méthodologie E-E-A-T** : qui, sources, fréquences de mise à jour (la confiance d'un "média").
- **Newsletter mensuelle "Crete in numbers"** (Resend déjà câblé, capture réparée 09/06).
- Extension niches data : prix par zone/mois, affluence par plage si data trouvable.

**KPI vague 3 (échéance 10/09/2026)** : 500 clics GSC/28j (cible déjà posée le 14/05) ; ≥5 referring domains gagnés par le rapport ; revenu affilié > 0 documenté ; citations IA en croissance mesurée.

## Mesure de la couronne "premier média touristique de Crète" (revue trimestrielle)

1. Sessions organiques vs concurrents non-officiels (cretanbeaches, allincrete, WeLoveCrete) — proxy Similarweb/positions GSC
2. Citations ChatGPT/Perplexity sur le panel de requêtes Crète (baseline à poser en vague 2)
3. Referring domains (Bing Webmaster + GSC)

Horizon honnête : 24-36 mois. Le chemin : l'usage répété d'abord, l'autorité suit.

## Ce qu'on ne fait pas (décisions d'économie)

- Pas de sur-investissement news (volatil ; le pipeline tourne seul, suffisant)
- Pas d'itinerary builder (lourd, concurrentiel, hors pattern)
- Pas de course au volume éditorial généraliste (la leçon des 24K pages)
