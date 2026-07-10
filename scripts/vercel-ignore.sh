#!/bin/bash
# Politique de build Vercel (multi-terminal, 1 seul slot de build Hobby).
# Probleme resolu : chaque push declenchait 3 builds (branche feat + master + main
# pour le meme sha) et les doublons passaient devant la prod dans la file.
#   main            -> toujours builde (prod), sauf changement docs-only
#   master          -> jamais builde (miroir de staging, meme sha que main ou feat)
#   autres branches -> preview seulement si le message de commit contient [preview]
# Convention exit code Vercel : 0 = skip le build, 1 = build.

if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  if git diff --quiet HEAD^ HEAD -- . ':(exclude)docs'; then
    exit 0
  fi
  exit 1
fi

if [ "$VERCEL_GIT_COMMIT_REF" = "master" ]; then
  exit 0
fi

case "$VERCEL_GIT_COMMIT_MESSAGE" in
  *"[preview]"*) exit 1 ;;
esac
exit 0
