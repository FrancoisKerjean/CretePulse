#!/usr/bin/env bash
# Runner enrichissement bento : toutes les familles en série via le LLM local Ollama.
# Lancé en nohup, log /root/enrich.log. Idempotent (bento_tiles IS NULL).
set -u
echo "### RUN START $(date -u)"
for f in heritage nature village beach; do
  echo "### FAMILY $f START $(date -u +%H:%M:%S)"
  python3 /root/enrich_bento.py --family "$f"
  echo "### FAMILY $f END $(date -u +%H:%M:%S)"
done
echo "### ALLDONE $(date -u)"
