#!/bin/bash
# ship — envoie le chantier courant vers `master`, la file du deploy de 20h Athens.
#
# Modele : tout ce qui est sur `master` a 20h part en prod (Action daily-deploy,
# promotion master->main 1x/jour). `ship` fait atterrir ta branche feat/* sur
# master en un geste, SANS jamais toucher `main`.
#
# Usage (depuis ta branche feat/*, quand c'est vert et valide) :
#   npm run ship
#   SHIP_SKIP_CHECK=1 npm run ship     # bypass npm run check (a eviter)
#
# Ce que fait ship :
#   1. garde-fous (pas sur master/main, working tree propre)
#   2. npm run check (si node_modules present)
#   3. integre origin/master DANS ta branche puis push ff origin HEAD:master
#      (marche en worktree ou master est checkout ailleurs ; retry si un autre
#       terminal a pousse entre-temps)
# Il ne pousse PAS main : la promotion prod est 1x/jour (cf docs/WORKFLOW-MULTI-TERMINAL.md).
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 1. Garde-fous de branche
if [ "$BRANCH" = "main" ]; then
  echo "STOP: jamais ship depuis main (main = prod, promue 1x/jour a 20h Athens)."
  exit 1
fi
if [ "$BRANCH" = "master" ]; then
  echo "Tu es sur master : ton travail est deja dans la file de 20h."
  echo "Pour le sauvegarder : git push origin master"
  exit 1
fi

# 2. Working tree propre (sinon du travail non commite serait laisse de cote)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "STOP: working tree sale. Commit ton travail d'abord (stage explicite, PAS git add -A)."
  git status --short
  exit 1
fi

# 3. Vert avant push
if [ "${SHIP_SKIP_CHECK:-0}" = "1" ]; then
  echo "SHIP_SKIP_CHECK=1 -> checks sautes (Vercel reste le filet build)."
elif [ ! -d node_modules ]; then
  echo "node_modules absent dans ce worktree -> checks locaux sautes (Vercel reste le filet)."
else
  echo "-> npm run check"
  npm run check
fi

# 4. Integrer master a jour dans la branche, puis ff-push vers master (retry x3)
pushed=0
for i in 1 2 3; do
  git fetch origin master --quiet
  if ! git merge origin/master --no-edit; then
    echo "STOP: conflit avec master. Resous, commit, relance 'npm run ship'."
    exit 1
  fi
  if git push origin "HEAD:master"; then
    pushed=1
    break
  fi
  echo "master a bouge (autre terminal), retry $i/3..."
done
if [ "$pushed" != "1" ]; then
  echo "STOP: push master rejete 3x (concurrence). Relance 'npm run ship'."
  exit 1
fi

COUNT=$(git rev-list --count origin/main..origin/master 2>/dev/null || echo "?")
echo ""
echo "OK : '$BRANCH' integre dans master et pousse (0 build)."
echo "     $COUNT commit(s) en attente sur master -> partiront au deploy de 20h Athens."
echo "     Deploy immediat si urgent : bouton 'Run workflow' sur l'Action daily-deploy."
