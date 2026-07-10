# Workflow multi-terminal — crete.direct

Plusieurs terminaux Claude Code travaillent en parallèle sur ce repo. Objectif :
isolation **structurelle** (par construction) au lieu de **disciplinaire** (par
vigilance). Adopté le 13/06/2026 après une journée à 4 chantiers sur `master`
partagé (affiliation, bus horaires, bus alertes, Meta) qui n'a tenu que par
discipline manuelle.

## Modèle de branches

- `main` = **production** (Vercel déploie depuis `main`). On n'y commit JAMAIS
  directement. On y arrive uniquement par merge depuis `master`.
- `master` = **intégration** stable. Ne contient que du code vert (compile +
  validé). On ne bricole pas dessus.
- `feat/<sujet>` / `fix/<sujet>` / `seo/<sujet>` = **chantier**. Une branche par
  chantier, partant de `master`. C'est là qu'on travaille.

## Règle d'or : 1 chantier = 1 branche

```bash
git switch master && git pull            # repartir d'un master à jour
git switch -c feat/affiliation           # nouvelle branche de chantier
# ... travail, commits LIBRES (la branche EST le périmètre) ...
```

Sur une branche de chantier, plus besoin de `git add <chemins>` chirurgical : la
branche isole déjà ton travail. **Mais `git add -A` / `git add .` restent
interdits** (ils emballent les artefacts non suivis : logs, `.next`, captures,
`*.geojson`). Stage tes fichiers, pas le dossier.

## Voir sa page live sans toucher la prod

Depuis le 10/07/2026, les previews sont **opt-in** (politique `scripts/vercel-ignore.sh`,
câblée dans `vercel.json`). Raison : 1 seul slot de build Vercel Hobby partagé entre
tous les terminaux ; chaque push déclenchait 3 builds (feat + master + main du même sha)
et les doublons faisaient la queue devant la prod.

- `main` → toujours buildé (prod)
- `master` → jamais buildé (miroir, doublon)
- `feat/*` → preview SEULEMENT si le message de commit contient `[preview]`

```bash
git commit -m "feat(page): nouvelle section [preview]"   # → Vercel preview URL
git push -u origin feat/affiliation
```

Tu valides la page sur l'URL preview. La prod (`main`) n'est jamais affectée.
Pas besoin de preview (changement backend, script VPS, admin) ? Commit normal,
zéro build consommé.

## Intégrer et déployer

```bash
# quand la branche est verte (tsc + next build OK) et validée en preview :
git switch master && git merge feat/affiliation   # intégration
git push origin master                            # sauvegarde (ne déploie pas)
git push origin master:main                       # → DÉPLOIE en prod
git branch -d feat/affiliation                     # nettoyage
```

`master` ne déploie pas (filet : on intègre sans mettre en prod). Le push vers
`main` est l'acte de déploiement, conscient et choisi.

## Dev server en parallèle : worktree (optionnel, à la demande)

Le working tree de `cretepulse-build` est partagé → **un seul `next dev` à la
fois** (lock + cache `.next` communs). Si tu as besoin de faire tourner ton
propre dev server en même temps qu'un autre terminal, prends un worktree dédié :

```bash
git worktree add ../cp-affiliation feat/affiliation   # dossier + .next isolés
cd ../cp-affiliation && npm install                   # coût : node_modules par worktree
npm run dev -- -p 3100                                 # ton port à toi
# ... à la fin :
cd ../cretepulse-build && git worktree remove ../cp-affiliation
```

Coût réel : un `npm install` par worktree. Donc worktree **seulement** quand tu
as vraiment besoin d'un dev server live simultané. Pour du SSR validé au `tsc`,
une branche simple suffit.

## Garde-fous automatiques (déjà en place)

- **Vercel ne sert jamais un build cassé** : si `next build` échoue, le
  déploiement échoue et la prod reste sur le dernier build OK. La compilation
  est un filet automatique.
- Author git = `kerjeanfrancois29` (sinon Vercel bloque).

## Pourquoi (rationale)

Au niveau **fichier**, Next App Router isole déjà (1 route = 1 dossier) : deux
chantiers sur des pages différentes ne se touchent pas. Le risque résiduel est
au niveau **git/déploiement** : sur `master` partagé, un commit qui compile mais
est faux, ou un `git add -A` accidentel, casse toute la prod (blast radius
partagé). La branche par chantier supprime ce risque par construction et offre
en bonus une preview live gratuite.
