# Carte live — CTA (donner un but à la carte `/live`)

**Date** : 2026-06-15
**Auteur** : Kami + Claude (brainstorming)
**Statut** : design validé (brainstorming), prêt pour plan d'implémentation
**Prédécesseur** : la carte `/live` (specs `2026-06-15-bus-live-engine-design.md` + `2026-06-15-sp4-live-map-design.md`) est fonctionnelle mais **sans but** : un « wow » qui ne déclenche aucune action.

## Problème

La carte montre les bus en direct (estimatif), c'est joli, mais elle ne sert à rien commercialement : aucune destination, aucun CTA. On ne déploie pas en prod tant qu'elle n'a pas de but.

## Décisions de cadrage (verrouillées avec Kami au brainstorming)

| Sujet | Décision |
|---|---|
| Rôle de la carte | **Outil → action monétisable** (pas aimant à trafic seul, pas vitrine, pas capture d'audience). |
| Actions | **Combo** : planifier un trajet (bus) **et** louer une voiture (revenu direct affilié). |
| Mécanisme | **Deux boutons fixes** (YAGNI). PAS de champ destination, PAS d'autocomplétion, PAS de logique contextuelle « cette zone a-t-elle un bus ». |
| Placement | **Barre en bas, centrée**, au-dessus de l'attribution. Mobile : boutons pleine largeur. |
| Hiérarchie | Deux boutons à **égalité visuelle** (le voyageur choisit selon son besoin ; honnêteté = on ne masque pas que le bus ne couvre pas tout). |

## Composant

Ajout d'une barre de CTA dans l'overlay de la carte (`LiveMapClient.tsx`, déjà `"use client"`), en bas centrée :

- **« Planifier un trajet » / « Plan a trip »** → lien vers `/buses` (le journey planner existant). Bouton plein **aegean** (`bg-aegean text-white`).
- **« Louer une voiture » / « Rent a car »** → lien vers `/car-rental` (page affiliée déjà en prod = revenu direct). Bouton plein **terra/or** (`bg-terra text-white` ou `bg-sun text-text`).

Détails :
- Liens via `import { Link } from "@/i18n/navigation"` (même mécanisme que `Header.tsx` → préfixe de locale automatique, pas de `/[locale]/` manuel).
- Libellés FR/EN ajoutés à l'objet `T` inline existant (`planTrip`, `rentCar`) ; fallback `en`.
- Conteneur : `pointer-events-none` (laisse la carte draggable) avec `pointer-events-auto` sur chaque bouton.
- Forme charte : `rounded-full`, `font-heading font-semibold`, `shadow`, `backdrop-blur`, taille tap-friendly (`px-4 py-2.5`, `text-sm`).
- Responsive : sur mobile (`< sm`), les deux boutons passent en `flex-1` (pleine largeur, côte à côte) ; sur desktop, largeur auto centrée.
- Icône légère optionnelle (lucide `Bus` / `Car`) si déjà disponible dans le repo, sinon texte seul.

## Réutilisation

- `Header.tsx` : pattern exact des liens locale-préfixés (`Link` de `@/i18n/navigation`).
- Charte `globals.css` : `bg-aegean`, `bg-terra`, `bg-sun`, `text-white`, `font-heading`.
- Les routes `/buses` et `/car-rental` existent et sont en prod.

## Non-objectifs (YAGNI)

- Pas de champ « Où vas-tu ? », pas d'autocomplétion, pas de mapping destination → bus/voiture.
- Pas de popup au clic sur un bus/ligne (séparé, futur éventuel).
- Pas de billetterie bus (n'existe pas encore).
- Pas de tracking custom au-delà de Vercel Analytics déjà en place (les clics sortants vers `/buses`/`/car-rental` sont des navigations internes mesurables).

## Tests & vérification

Composant JSX (deux liens) sans logique pure → pas de test unitaire `check-*.mjs`. Vérification :
- `npx tsc --noEmit` vert.
- Visuel : capture Playwright locale (les 2 boutons visibles bas-centré, draggable carte OK, mobile pleine largeur) AVANT push, puis preview Vercel.

## Limites assumées

- Les deux CTA sont génériques (pas contextuels) → conversion correcte mais pas optimale. Acceptable pour la v1 ; le contextuel (champ destination) reste une évolution future si les chiffres le justifient.
