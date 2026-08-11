#!/bin/bash
# Etape 1 sur 3 du rapatriement des photos /stays. A LANCER SUR LE VPS.
# Voir README.md du meme dossier pour l ordre et le pourquoi.
#
# Rapatrie les photos des annonces /stays sous la racine deja servie par
# media.crete.direct. Lit les URL SOURCES depuis la base, jamais depuis une
# liste recopiee : le seed pourrait avoir derive.
#
# Nommage cible uniforme : <slug>/NN-photo.<ext>, NN = position DANS LE TABLEAU.
# ⛔ Les noms d origine ne sont pas conserves : ceux de l annonce 2 portent le
# patronyme du proprietaire, qui n a rien a faire dans une URL de crete.direct.
# L ORDRE est ce qui compte pour l affichage, et il est preserve.
#
# Idempotent : un fichier deja present et non vide n est pas retelecharge.
# N ecrit RIEN en base et ne change RIEN de ce que le site sert.

BASE=/opt/cretepulse-media/stays

echo "=== espace disque ==="
df -h /opt | tail -1

mkdir -p "$BASE"

ok=0; skip=0; ko=0

while IFS='|' read -r slug ord url; do
  [ -z "$slug" ] && continue
  ext="${url##*.}"
  case "$ext" in jpg|jpeg|png|webp) ;; *) ext=jpg ;; esac
  n=$(printf '%02d' "$ord")
  dir="$BASE/$slug"
  mkdir -p "$dir"
  out="$dir/$n-photo.$ext"

  if [ -s "$out" ]; then
    skip=$((skip + 1))
    continue
  fi

  code=$(curl -s -o "$out" -w '%{http_code}' --max-time 90 "$url")
  sz=$(stat -c%s "$out" 2>/dev/null || echo 0)
  if [ "$code" = "200" ] && [ "$sz" -gt 1000 ]; then
    ok=$((ok + 1))
    printf '  ok   %s/%s-photo.%s  %8s octets\n' "$slug" "$n" "$ext" "$sz"
  else
    ko=$((ko + 1))
    printf '  ECHEC %s/%s-photo.%s  HTTP %s, %s octets  <- %s\n' "$slug" "$n" "$ext" "$code" "$sz" "$url"
    rm -f "$out"
  fi
done < <(docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -At -F '|' -c \
  "select l.slug, o.ord, o.url from stay_listings l, unnest(l.photos) with ordinality as o(url, ord) order by l.id, o.ord;")

echo "=== bilan : $ok telechargees, $skip deja presentes, $ko en echec ==="
echo "=== arborescence ==="
for d in "$BASE"/*/; do
  printf '%-32s %3s fichiers  %s\n' "$(basename "$d")" "$(ls -1 "$d" | wc -l)" "$(du -sh "$d" | cut -f1)"
done
exit $ko
