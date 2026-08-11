#!/bin/bash
# Etape 3 sur 3 du rapatriement des photos /stays. A LANCER SUR LE VPS.
#
# Bascule les URL de photos des 3 annonces vers media.crete.direct.
#
# ⛔ crete.direct lit cette colonne EN DIRECT : la bascule change la prod a la
# seconde ou elle passe. Elle ne part donc qu apres avoir verifie que CHACUNE
# des nouvelles URL repond 200. Une seule qui manque et rien n est ecrit.
#
# Sauvegarde AVANT : la colonne actuelle est copiee dans stay_listings_photos_bak
# (creee si absente). Le retour arriere est imprime en fin de sortie.
#
# Usage : 3-swap-photos.sh [--dry-run]

PSQL="docker exec -i cretepulse-postgres psql -U postgres -d cretepulse"
DRY=0
[ "$1" = "--dry-run" ] && DRY=1

# Meme expression partout : l extension vient de l URL SOURCE, la position vient
# de l ordre du tableau. C est exactement ce que 1-fetch-photos.sh a ecrit sur
# le disque, et c est ce qui garantit que les deux ne peuvent pas diverger.
CIBLE="'https://media.crete.direct/stays/' || l.slug || '/' || lpad(o.ord::text,2,'0') || '-photo.' || case when o.url like '%.png' then 'png' when o.url like '%.jpeg' then 'jpeg' when o.url like '%.webp' then 'webp' else 'jpg' end"
DEPLIE="from stay_listings l, unnest(l.photos) with ordinality as o(url, ord)"

echo "=== 1. chaque nouvelle URL repond-elle 200 ? ==="
ko=0; n=0
while read -r url; do
  [ -z "$url" ] && continue
  n=$((n + 1))
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$url")
  [ "$code" = "200" ] || { echo "  ECHEC HTTP $code  $url"; ko=$((ko + 1)); }
done < <($PSQL -At -c "select $CIBLE $DEPLIE order by l.id, o.ord;")

if [ "$ko" -gt 0 ]; then
  echo "=== $ko URL sur $n ne repondent pas 200 : ON NE TOUCHE PAS A LA BASE ==="
  echo "    (le chemin /stays/* de Caddy est-il en place et Caddy recharge ?)"
  exit 1
fi
echo "  les $n repondent 200"

if [ "$DRY" = "1" ]; then
  echo "=== dry-run : la base n est PAS modifiee ==="
  $PSQL -At -F '|' -c "select l.slug, count(*) as photos, min($CIBLE) as premiere $DEPLIE group by l.slug order by l.slug;"
  exit 0
fi

echo "=== 2. sauvegarde de la colonne actuelle ==="
$PSQL -q -c "create table if not exists stay_listings_photos_bak (listing_id bigint, slug text, photos text[], sauve_le timestamptz default now());"
$PSQL -q -c "insert into stay_listings_photos_bak (listing_id, slug, photos) select id, slug, photos from stay_listings;"
$PSQL -At -c "select count(*) from stay_listings_photos_bak where sauve_le = (select max(sauve_le) from stay_listings_photos_bak);" | xargs echo "  lignes sauvegardees :"

echo "=== 3. bascule ==="
$PSQL -c "
update stay_listings t
set photos = sub.nouvelles
from (
  select l.id, array_agg($CIBLE order by o.ord) as nouvelles
  $DEPLIE
  group by l.id
) sub
where t.id = sub.id;"

echo "=== 4. etat apres bascule ==="
$PSQL -At -F '|' -c "select id, slug, array_length(photos,1) as n, split_part(replace(photos[1],'https://',''),'/',1) as hote from stay_listings order by id;"

echo "=== 5. combien d URL portent encore la marque ? ==="
$PSQL -At -c "select count(*) from stay_listings l, unnest(l.photos) as u(url) where u.url ilike '%kairos%';" | xargs echo "  URL contenant 'kairos' :"

echo
echo "RETOUR ARRIERE, si besoin :"
echo "  docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -c \"update stay_listings l set photos = b.photos from stay_listings_photos_bak b where b.listing_id = l.id and b.sauve_le = (select max(sauve_le) from stay_listings_photos_bak);\""
