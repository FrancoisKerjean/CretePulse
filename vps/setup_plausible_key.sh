#!/usr/bin/env bash
# Genere une cle Stats API Plausible pour partner_report.py et la pose dans
# /opt/cretepulse/.env. La cle ne quitte jamais le VPS et n'est jamais affichee.
# Usage (one-shot) : bash setup_plausible_key.sh
set -euo pipefail

KEY=$(openssl rand -base64 64 | tr "+/" "-_" | tr -d "\n=" | cut -c1-64)

cd /opt/plausible
docker compose exec -T plausible /app/bin/plausible rpc "user = Plausible.Repo.get_by!(Plausible.Auth.User, email: \"kairos.guest.management@gmail.com\"); {:ok, team} = Plausible.Teams.get_or_create(user); %Plausible.Auth.ApiKey{} |> Plausible.Auth.ApiKey.changeset(team, %{\"name\" => \"partner-report\", \"key\" => \"$KEY\", \"user_id\" => user.id}) |> Plausible.Repo.insert!(); IO.puts(\"API_KEY_INSERTED\")"

ENV_FILE=/opt/cretepulse/.env
touch "$ENV_FILE"
if grep -q "^PLAUSIBLE_API_KEY=" "$ENV_FILE"; then
  sed -i "s|^PLAUSIBLE_API_KEY=.*|PLAUSIBLE_API_KEY=$KEY|" "$ENV_FILE"
else
  printf "PLAUSIBLE_API_KEY=%s\n" "$KEY" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

# Smoke test sans afficher la cle
HTTP=$(curl -s -o /tmp/plausible_test.json -w "%{http_code}" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"site_id":"crete.direct","metrics":["visitors"],"date_range":"7d"}' \
  https://analytics.crete.direct/api/v2/query)
echo "STATS_API_HTTP=$HTTP"
head -c 200 /tmp/plausible_test.json; echo
rm -f /tmp/plausible_test.json
