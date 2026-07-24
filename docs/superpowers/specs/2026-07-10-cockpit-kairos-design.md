# Spec — /admin/cockpit « Cockpit Kairos » (launcher Win98)

Date : 10/07/2026 · Statut : EN ATTENTE VALIDATION KAMI (v2 après recadrage)
Mockup : `docs/mockups/2026-07-10-cockpit-kairos-win98.html`

## Recadrage Kami 10/07 (v2)

« C'est un cockpit qui doit me rediriger vers mes liens (Plausible, CDR admin, CDR flux),
pas faire un tableau de bord. » → **Launcher de liens, zéro donnée agrégée.**
La v1 (tableau de bord 5 volets + exporteur VPS + tables cockpit_*) est ABANDONNÉE :
pas d'exporteur, pas de migration, pas de requête DB sur la page.

## Ce que c'est

Une page `/admin/cockpit` = bureau Windows 98 d'icônes-raccourcis, groupées par zones.
Un clic = la vraie page de l'outil. C'est tout.

## Emplacement & auth

- `src/app/admin/cockpit/page.tsx` dans cretepulse-build — page **statique** (aucun fetch),
  server component, zéro JS client (sauf horloge taskbar décorative, optionnelle).
- Auth : clone exact du pattern `/admin/flux` — `CAR_ADMIN_SECRET`, route
  `/admin/cockpit/auth?key=`, cookie httpOnly `car_admin` (30 j, path=/admin).
  Avantage : une fois entré dans le cockpit, les liens `/admin/flux`, `/admin/car-rental`,
  `/admin/activities` fonctionnent sans ré-auth (même cookie, même domaine).
- Les liens Plausible s'ouvrent sur la session Plausible du navigateur (login existant).

## DA : Windows 98

Desktop teal `#008080`, icônes bevel 34px + labels blancs ombrés, sélection bleu
`#000080` pointillés jaunes, petite fenêtre « À propos », barre des tâches + horloge.
CSS scopé au dossier cockpit, aucune fuite dans la DA publique Kalimera.

## Liens (v2 — liste à trancher par Kami sur le mockup)

| Zone | Lien | URL |
|---|---|---|
| Analytics | Plausible crete.direct | `https://analytics.crete.direct/crete.direct` |
| Analytics | Plausible kairosguest | `https://analytics.crete.direct/kairosguest.com` |
| Analytics | Plausible nov-ai.xyz | `https://analytics.crete.direct/nov-ai.xyz` |
| Analytics | Plausible IEUF | `https://analytics.crete.direct/iletaitunfut.com` |
| Admin crete.direct | FLUX_CRETE.EXE | `/admin/flux` |
| Admin crete.direct | CAR_ADMIN.EXE | `/admin/car-rental` |
| Admin crete.direct | ACTIVITIES.EXE | `/admin/activities` |
| Admin crete.direct | AVIS.EXE (proposé) | modération avis |
| Outils (proposés) | Search Console crete.direct | GSC |
| Outils (proposés) | Vercel / Resend / Sentry | dashboards |

Ajouter/retirer un lien = éditer un tableau const dans le fichier page (pas de DB).

## Contraintes

- Lecture seule absolue : aucune server action, aucun fetch, aucune donnée.
- Dev local port 3220+. Build : prod = merge → `main`, `master` jamais buildé.

## Livraison (1 seul lot)

Page + route auth + CSS Win98 → capture avant push → prod. Pas de migration, pas de VPS.
