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

## Règles NON NÉGOCIABLES
- Git author : kerjeanfrancois29 (sinon Vercel bloque)
- Funnel Kairos discret (pas de branding Kairos visible)
- Contenu multilingue : accents et caractères spéciaux corrects dans TOUTES les langues
- Cron events pour mise à jour automatique du contenu
- Sentry configuré pour le monitoring erreurs
