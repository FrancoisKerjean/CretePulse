#!/usr/bin/env bash
# Copie RESEND_API_KEY des env Vercel production vers /opt/cretepulse/.env (VPS).
# Aucun secret n'est affiche ni ne reste en local. Usage : bash vps/push_resend_key.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npx vercel env pull .env.vercel-prod.tmp --environment=production --yes >/dev/null
trap 'rm -f .env.vercel-prod.tmp .resend.tmp' EXIT

grep "^RESEND_API_KEY=" .env.vercel-prod.tmp | tr -d '"' > .resend.tmp
test -s .resend.tmp || { echo "RESEND_API_KEY introuvable dans les env Vercel prod"; exit 1; }

scp -q .resend.tmp root@89.167.115.63:/tmp/.resend.tmp
ssh root@89.167.115.63 'bash -c "
  set -e
  ENV_FILE=/opt/cretepulse/.env
  touch \$ENV_FILE
  grep -v \"^RESEND_API_KEY=\" \$ENV_FILE > \$ENV_FILE.new || true
  cat /tmp/.resend.tmp >> \$ENV_FILE.new
  mv \$ENV_FILE.new \$ENV_FILE
  chmod 600 \$ENV_FILE
  rm -f /tmp/.resend.tmp
  grep -c \"^RESEND_API_KEY=\" \$ENV_FILE
"'
echo "RESEND_API_KEY posee sur le VPS"
