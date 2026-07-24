# Spec — `/projet` : variantes par public (Visiteur / Institution / Entreprise)

Date : 2026-06-17
Statut : design validé par Kami (brainstorming), prêt pour writing-plans.
Branche : `feat/projet-publics` (worktree `cretepulse-projet-publics`).

## 1. Contexte & objectif

`/projet` existe déjà en prod : page-campagne communautaire, ton « livre pour enfant »,
Kriri raconte l'histoire des bus crétois, CTA = suivre Instagram/Facebook + partager
(cf `src/app/[locale]/projet/page.tsx`, `ParcoursClient`, `src/lib/campagne.ts`). Elle « dort » :
aucune demande de financement.

Objectif : faire de `/projet` une page qui **va chercher de l'argent**, en s'adressant à
**trois publics** avec des messages dédiés, **dans la même direction artistique** que la page
existante (le « parcours » : route serpentante, Kriri en bus, cards cartoon, frise, charte Kalimera).

## 2. Décisions validées (Kami)

- **Re-toning par public** : le contenu et le niveau de détail changent selon le public, mais
  l'**habillage reste la DA parcours** de `/projet` (pas de style « one-pager corporate »).
- **3 routes + sélecteur de navigation** (option retenue contre l'URL unique, pour le SEO et le
  partage de liens ciblés) :
  - `/projet` → **Visiteur** (route canonique, **inchangée**, défaut).
  - `/projet/institutions` → **Institution**.
  - `/projet/entreprises` → **Entreprise**.
- **Asks par public** :
  - Visiteur : suivre + partager (inchangé).
  - Institution : partenariat de données (accès horaires KTEL) + reconnaissance partenaire flux +
    **co-financement de l'infrastructure** → **formulaire de contact** + **bouton « Télécharger le dossier » (PDF)**.
  - Entreprise (modèle E3, deux portes) :
    - **Soutenir** : sponsor infra, **formulaire sponsor, sans grille de prix** au lancement.
    - **Être visible** : renvoi vers la page **`/partners`** existante (pas de doublon de régie).
- **Formulaires intégrés** (capture de lead via API, pas mailto).
- **Langues : FR + EN** d'abord ; **EL en V2**.

## 3. Architecture

### 3.1 Routes & pages
- `src/app/[locale]/projet/page.tsx` (existant) : ajouter le composant `AudienceSwitch active="visiteur"`
  en tête + un lien discret en bas (« Vous êtes une institution / une entreprise ? ») vers les deux
  nouvelles routes. **Aucune autre modification** du contenu visiteur.
- `src/app/[locale]/projet/institutions/page.tsx` (nouveau).
- `src/app/[locale]/projet/entreprises/page.tsx` (nouveau).
- Chaque nouvelle page : `setRequestLocale`, `generateStaticParams` (en, fr), `generateMetadata`
  ciblée par public, `buildAlternates(locale, "/projet/<x>")`, `revalidate = 86400`, `dynamicParams = true`
  (fallback EN pour les 20 autres locales, comme `/projet`).

### 3.2 Contenu (copy, sérialisable)
- `src/lib/campagne.ts` (visiteur) : **inchangé**.
- `src/lib/campagne-pro.ts` (nouveau) : type partagé `ProCopy` + helpers communs aux deux modes pro.
  Briques : `meta {title, description}`, `hero {kicker, title, sub}`, `stats: {n, l}[]` (4),
  `beats: {id, kicker, kickerVariant, scene, title, body, flip?, layout}[]`, `frise: {year, title, text, future?}[]` (3),
  `cta {...}`. Textes FR + EN, fallback EN.
- `src/lib/campagne-institutions.ts` (nouveau) : `ProCopy` institution + bloc `ask` + champs `form`
  (institution) + lien dossier.
- `src/lib/campagne-entreprises.ts` (nouveau) : `ProCopy` entreprise + `doors: {id, title, body, cta, href}[]`
  (Soutenir → ancre form ; Être visible → `/partners`) + champs `form` (sponsor).
- Toutes les chaînes : zéro tiret cadratin, zéro flèche dans les libellés, accents corrects (FR + EN).

### 3.3 Composants
Réutiliser le langage visuel existant : `RoadDecor`, `KriBus`/`GoatStanding`, `Card`, `Reveal`,
scènes de `src/components/campagne/scenes/`.

Nouveaux composants dans `src/components/campagne/pro/` :
- `AudienceSwitch.tsx` : sélecteur 3 onglets (Visiteur · Institution · Entreprise) en vrais `<Link>`
  (crawlables), public actif passé en prop, charte cartoon (pills bordure encre + ombre dure).
  **Partagé sur les 3 routes.**
- `ProParcours.tsx` : assemble la page pro à partir d'un `ProCopy` (RoadDecor + hero card + beats
  scène/card alternés + frise `DataToVision` + acte final). Analogue data-driven de `ParcoursClient`.
- `DataToVision.tsx` : la frise 3 temps (Aujourd'hui / Demain / 2028), cards cartoon.
- `LeadForm.tsx` : formulaire cartoon, jeu de champs configurable (`variant="institution" | "sponsor"`),
  honeypot, états `idle/sending/sent/error`, POST `/api/projet-lead`.
- `SponsorDoors.tsx` : les 2 portes entreprise (Soutenir → ancre `#sponsor-form` ; Être visible → `/partners`).
- `DossierButton.tsx` : bouton « Télécharger le dossier » (lien vers le PDF statique), mode institution.

Les nouvelles « scènes » simples (constat chèvres qui attendent, 🗺️, 🤝, 📈) peuvent réutiliser le
patron `box` cartoon ou les scènes existantes ; pas de nouvelle illustration lourde requise.

### 3.4 API lead
- `src/app/api/projet-lead/route.ts` (POST) :
  - Body : `{ kind: "institution" | "sponsor", nom, email, ...champs spécifiques, website?, message, hp }`.
  - **Honeypot** (`hp`) rempli → réponse `{ ok: true }` silencieuse, aucun envoi.
  - Validation : champs requis présents + format email. Sinon `400`.
  - **Dédup** courte : même `email + kind` < 10 min → `{ ok: true }` sans renvoyer d'email.
  - **Envoi Resend** : `to` = `contact@kairosguest.com`, `cc` = `hello@crete.direct`, `reply-to` = email du contact,
    sujet `[/projet] <kind> — <nom/organisme/entreprise>`, corps texte récapitulant les champs.
    Gérer `{ error }` de Resend explicitement (ne pas supposer un throw — leçon car-rental) ; échec → `500` + log.
  - **Webhook optionnel** : si `process.env.CRETEDIRECT_LEAD_WEBHOOK` présent, POST JSON (notif n8n/Telegram).
  - **Pas de table DB** au lancement (YAGNI). Une table `projet_leads` (VPS, service_role) sera ajoutée
    si le volume le justifie.

### 3.5 Dossier PDF (institution)
- Générer un **PDF statique** depuis le one-pager autorités existant
  (`~/Desktop/crete-direct-onepager-autorites.html`) via Playwright `page.pdf()` →
  `public/dossiers/crete-direct-institutions-fr.pdf` + `-en.pdf`.
- `DossierButton` pointe vers le bon PDF selon la locale. Robuste, zéro dépendance runtime.

### 3.6 SEO / i18n
- `generateMetadata` : titres + descriptions **ciblés par public** (FR/EN), OG.
- `buildAlternates` FR/EN par route ; hreflang propre même sur les 20 locales fallback EN.
- `sitemap.xml` : **+2 routes × 2 langues** (institutions, entreprises). `/projet` déjà présent.
- `/projet` canonique **inchangée** ; les deux nouvelles routes **indexables**.
- Le sélecteur est en `<Link>` (crawlable), pas du JS opaque.

### 3.7 Footer
- Le lien « Notre projet » existant reste vers `/projet`. Pas de nouveau lien footer.

## 4. Hors scope (V2 / plus tard)
- **EL (grec)** sur les 3 modes.
- **Grille de paliers sponsor** (montants).
- **Table DB** `projet_leads`.
- **RDV calendaire** institution.
- **Paiement sponsor direct** (Stripe).

## 5. Gates / vérifications
- `npx tsc --noEmit` = 0.
- Script `check` : structure `ProCopy` cohérente FR + EN (mêmes clés), 0 tiret cadratin, 0 flèche dans les libellés.
- Playwright : `/projet`, `/projet/institutions`, `/projet/entreprises` = 200 en FR + EN ; le sélecteur
  navigue ; le formulaire POST (mocké) ; aucun chevauchement desktop (1024/1366) + mobile (414).
- `next build` EXIT 0.

## 6. Risques & mitigations
- **Ton cartoon pour des institutions** : assumé par Kami (DA unifiée). Mitigation : textes posés,
  chiffrés, sans jargon ; Kriri reste l'univers, pas le discours.
- **Multi-terminal** : travail en worktree isolé `feat/projet-publics`, **pas de merge `master:main`
  sans GO Kami**. `git add` explicite par fichier (jamais `-A`).
- **Build local** : `SUPABASE_SERVICE_KEY` requis à l'évaluation (préexistant) → `SUPABASE_SERVICE_KEY=dummy`
  pour les builds locaux ; Vercel a la vraie clé.

## 7. Référence mockups (DA validée)
- `~/Desktop/crete-direct-mockups/projet-institutions-parcours-mockup.html` (validé).
- `~/Desktop/crete-direct-mockups/projet-entreprises-parcours-mockup.html` (validé).
- Rendu live de référence : `~/Desktop/crete-direct-mockups/projet-live-fr.png` / `-en.png`.
