# CretePulse - Guide Touristique Crète Autonome

## Projet
- URL cible : crete.direct
- Stack : Next.js + TypeScript + Tailwind v4 + Supabase + Sentry
- Deploy : Vercel auto depuis branche main
- 22 langues, 24K+ pages générées

## Structure
- src/app/ : pages Next.js (App Router)
- scripts/ : enrichissement descriptions, traductions, fix accents
- supabase/ : migrations et config

## Commandes
- npm run dev : lancer en local
- npm run build : build production

## Workflow multi-terminal (NON NÉGOCIABLE)
Plusieurs terminaux Claude tournent en parallèle sur ce repo. Convention complète :
`docs/WORKFLOW-MULTI-TERMINAL.md`. Règles minimales :
- **1 chantier = 1 branche** `feat/<sujet>` (ou `fix/`/`seo/`) partant de `master`. On ne bricole PAS directement sur `master`, JAMAIS sur `main`.
- **`main` = prod** (Vercel déploie depuis main). On y arrive uniquement par merge depuis `master`. Déploiement = `git push origin master:main`, acte conscient.
- **`git add -A` / `git add .` INTERDITS** (emballent artefacts + travail d'autres terminaux). Stage tes fichiers explicitement.
- **Vert avant push** : `tsc` (+ `next build` si dispo) OK. Vercel ne sert jamais un build cassé (prod reste sur le dernier OK).
- **Preview OPT-IN (10/07/2026)** : les previews `feat/*` ne se buildent QUE si le message de commit contient `[preview]` ; `master` n'est plus jamais buildé (politique `scripts/vercel-ignore.sh`, 1 slot Hobby partagé — les doublons bouchaient la file devant la prod).
- **Dev server simultané** : prendre un `git worktree` dédié (dossier + `.next` + port isolés), seulement si besoin réel de dev live en parallèle.

## Règles NON NÉGOCIABLES
- Git author : kerjeanfrancois29 (sinon Vercel bloque)
- Funnel Kairos discret (pas de branding Kairos visible)
- Contenu multilingue : accents et caractères spéciaux corrects dans TOUTES les langues
- Cron events pour mise à jour automatique du contenu
- Sentry configuré pour le monitoring erreurs
