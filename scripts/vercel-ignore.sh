#!/bin/bash
# Politique de build Vercel (multi-terminal, 1 seul slot de build Hobby).
# Probleme resolu : chaque push declenchait 3 builds (branche feat + master + main
# pour le meme sha) et les doublons passaient devant la prod dans la file.
#   main            -> toujours builde (prod), sauf changement docs-only
#   master          -> jamais builde (miroir de staging, meme sha que main ou feat)
#   autres branches -> preview seulement si le message de commit contient [preview]
# Convention exit code Vercel : 0 = skip le build, 1 = build.

if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  # main est promu 1x/jour et embarque TOUTE une journee de commits (daily-deploy).
  # Comparer HEAD^..HEAD (dernier commit seulement) skiperait a tort une journee
  # de code si le dernier commit est docs-only. On compare donc la plage complete
  # depuis le dernier deploy prod reussi (VERCEL_GIT_PREVIOUS_SHA, expose car un
  # Ignored Build Step est present). Base inconnue (1er deploy / clone shallow)
  # -> on build par securite (jamais de faux skip).
  BASE="$VERCEL_GIT_PREVIOUS_SHA"
  if [ -n "$BASE" ] && git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
    if git diff --quiet "$BASE" HEAD -- . ':(exclude)docs'; then
      exit 0
    fi
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
