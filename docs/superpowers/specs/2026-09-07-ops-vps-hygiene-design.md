# Exploitation crete.direct : hygiène VPS et poste

Spec de design, 07/09/2026. Périmètre : `kairos-vps` (root@89.167.115.63, `ssh kairos-vps`) et le poste Windows. Tout ce qui suit a été lu en lecture seule le 07/09 ; aucune commande d'écriture n'a été passée. Ce document est un runbook : un agent l'exécute ligne par ligne, chaque section porte ses commandes et sa vérification.

Conventions du document : `[FACT 2026-09-07]` = lu ce jour sur la machine · `[HYP]` = non vérifié, à confirmer avant d'agir · ⛔ = interdit ou piège.

---

## 1. Objectif et non-objectifs

**Objectif** : zéro échec silencieux et zéro cron à vide non documenté sur crete.direct.

Concrètement, à la fin de l'exécution :
1. `systemctl --failed` sur le VPS ne liste ni `logrotate.service` ni `cretepulse-fraport-chq.service`, et tout futur échec d'une unité `cretepulse-*` produit un message Telegram.
2. Chaque cron crete.direct écrit une ligne de statut parsable (début, fin, code, durée) dans `/var/log/cretepulse-cron-status.log`, et un code non nul produit un message Telegram.
3. Les quatre crons qui tournent à vide ont chacun une décision écrite dans le fichier cron lui-même : coupé avec date et raison, ou gardé avec un « rien à faire » qui remonte au digest.
4. `Kairos-Tasks-Health` ne porte plus la ligne « ⛔ Angle mort : les crontab du VPS ne gardent aucun code de retour ».
5. La copie poste des crons reflète le VPS, pas l'inverse.

**Non-objectifs** (explicitement hors périmètre) :
- Réduire la consommation Claude des writers ou modifier la ligne éditoriale.
- Les 124 erreurs satori `substFormat: 3` sur `/api/og` (Vercel) : couvertes par la spec perf, on y renvoie.
- Sentry (tokens 403/400 sur le projet `kairos`) : prérequis humain, listé en section 10, pas traité ici.
- `Kairos-Social-Publisher` (poste, échec permanent depuis le 29/08, code 1 toutes les 15 min, `kairos-social-automation\publish-due.ps1`) : hors crete.direct. Signalé, pas touché.
- Les logs triathlon (`running-categories*.log`, 14 Mo, figés au 16/08) : autre projet, mentionnés pour l'inventaire disque seulement.
- Toute refonte des scripts eux-mêmes (writer-v2 hors section 8, scrapers, machines outreach).

---

## 2. logrotate

### 2.1 État mesuré

`[FACT 2026-09-07]` `logrotate.service` échoue chaque nuit à 00:00 UTC :

```
logrotate[2797549]: error: triathlon-results:19 duplicate log entry for /opt/triathlon-results-agent/rate-cron.log
logrotate[2797549]: error: found error in file triathlon-results, skipping
```

Cause : deux fichiers déclarent le même chemin.
- `/etc/logrotate.d/triathlon-agent` (29/07, 340 octets) : `rate-cron.log` seul, `weekly rotate 4 copytruncate`.
- `/etc/logrotate.d/triathlon-results` (16/08, 1 226 octets) : les quatre logs triathlon dont `rate-cron.log` à la ligne 19, `weekly rotate 8 dateext create 640`, avec un en-tête qui explique chaque choix.

logrotate lit `/etc/logrotate.d` par ordre alphabétique : `triathlon-agent` passe en premier et prend le chemin, `triathlon-results` est rejeté en bloc. Conséquence non écrite dans le ticket : **les trois autres logs triathlon (`running-results.log`, `triathlon-crawl.log`, `triathlon-rate.log`, ce dernier à 1,4 Mo) ne tournent pas non plus** depuis le 16/08, puisque tout le fichier est sauté.

`[FACT 2026-09-07]` Aucune règle pour les logs crete.direct. Mesures :
- `/var/log/cretepulse-news.log` 65,9 Mo, 704 002 lignes, première ligne datée du 15/04/2026 : 145 jours, soit environ 0,45 Mo/jour.
- `/var/log/cretepulse-health.log` 4,1 Mo · `cretepulse-video-news.log` 4,0 Mo · `cretepulse-video-weather.log` 3,4 Mo · `cretepulse-writer.log` 2,7 Mo · `cretepulse-weather.log` 2,1 Mo · `crete-events-scraper.log` 1,4 Mo.
- `du -ch` sur `cretepulse-*.log`, `crete-*.log`, `affiliate-*.log` : **86 Mo** au total.
- `/var/log/crete-content-bot/scraper.log` 11 Mo (répertoire possédé par `cretepulse:cretepulse`, fichier possédé par root).
- `/var/log/cretepulse-content/` 2,3 Mo · `/var/log/cretepulse/` 76 Ko.
- `/var/log` 737 Mo dont journal systemd 184 Mo. Disque `/` : 27 G / 38 G, 8,9 G libres (76 %).

Configuration globale (`/etc/logrotate.conf`, hors commentaires) : `weekly`, `su root adm`, `rotate 4`, `create`, `include /etc/logrotate.d`.

### 2.2 Correctif de la ligne dupliquée

Garder `triathlon-results` (le plus récent, le plus complet, celui qui documente ses choix) et retirer `triathlon-agent`. Ne pas supprimer : archiver.

```bash
mkdir -p /root/logrotate.d-archive
mv /etc/logrotate.d/triathlon-agent /root/logrotate.d-archive/triathlon-agent.retire-20260907
logrotate -d /etc/logrotate.conf 2>&1 | grep -iE "error|duplicate" || echo "aucune erreur"
```

⛔ Ne pas modifier `triathlon-results` pour retirer la ligne 19 à la place : c'est le fichier qui porte la justification (`dateext` à cause des archives `.1.gz` manuelles, `create` plutôt que `copytruncate`), et `rate-cron.log` y est cohérent avec ses trois frères.

### 2.3 Fichier `/etc/logrotate.d/cretepulse`

Trois strophes, parce que trois régimes d'écriture différents :

```
# Journaux crete.direct / CretePulse. Pose le 07/09/2026.
# Avant : aucune rotation, cretepulse-news.log pesait 65,9 Mo pour 145 jours.
#
# copytruncate partout : ces fichiers sont ecrits par des `>>` de cron ET par des
# StandardOutput=append: de systemd, qui gardent le descripteur ouvert entre deux
# lignes. Un `create` laisserait l ecrivain systemd continuer dans l inode detache.
# Ce n est pas le cas triathlon (cron pur, `create` suffit) : ne pas unifier.

/var/log/cretepulse-*.log
/var/log/crete-*.log
/var/log/affiliate-*.log
/var/log/reels-publish.log
/var/log/outbound-digest.log
{
    weekly
    rotate 4
    compress
    delaycompress
    copytruncate
    missingok
    notifempty
}

# Repertoires possedes par l utilisateur cretepulse (unites systemd User=cretepulse).
# `su` obligatoire : logrotate refuse un repertoire parent qui n appartient pas a
# l utilisateur de rotation (message « parent directory has insecure permissions »).
/var/log/cretepulse/*.log
/var/log/cretepulse-content/*.log
/var/log/crete-content-bot/*.log
{
    su cretepulse cretepulse
    weekly
    rotate 4
    compress
    delaycompress
    copytruncate
    missingok
    notifempty
}

# Le journal de statut des crons (section 5) : une ligne par passage, il doit rester
# lisible 8 semaines pour que Tasks-Health voie une tache muette.
/var/log/cretepulse-cron-status.log
{
    weekly
    rotate 8
    compress
    delaycompress
    copytruncate
    missingok
    notifempty
}
```

Points de vigilance :
- Le motif `/var/log/crete-*.log` couvre `crete-alert.log`, `crete-events-scraper.log`, `crete-direct-beach-day.log`, `crete-direct-social-promo.log`. Il ne couvre pas `crete-content-bot/` (répertoire), traité dans la deuxième strophe.
- `/opt/cretepulse/flux/flux.log` a déjà sa propre troncature dans la crontab root (`0 3 * * 0 tail -c 5M ...`). Ne pas le doubler ici.
- Les logs sous `/opt/*-outreach/*.log` (`detect_replies.log` 1,8 Mo chacun pour car et activities) ne sont pas dans `/var/log`. Les ajouter dans la première strophe si on veut les couvrir : `/opt/car-rental-outreach/*.log /opt/activities-outreach/*.log /opt/van-outreach/*.log /opt/backlink-outreach/*.log`. Recommandé, même régime.
- `[HYP]` Si `logrotate -d` refuse la deuxième strophe avec « insecure permissions » malgré `su`, c'est que le répertoire est inscriptible par le groupe : `chmod g-w` sur le répertoire, pas de `su` supplémentaire.

### 2.4 Test

```bash
install -m 644 -o root -g root /dev/stdin /etc/logrotate.d/cretepulse <<'EOF'
(contenu ci-dessus)
EOF
logrotate -d /etc/logrotate.d/cretepulse 2>&1 | grep -E "error|rotating pattern|considering|skipping" | head -40
logrotate -d /etc/logrotate.conf 2>&1 | grep -ciE "^error" # attendu : 0
```

Puis, plutôt que d'attendre minuit :

```bash
logrotate -v /etc/logrotate.d/cretepulse 2>&1 | tail -20
ls -la /var/log/cretepulse-news.log*   # attendu : .log (petit) + .log.1 (65,9 Mo, non compressé, delaycompress)
systemctl start logrotate.service && systemctl status logrotate.service --no-pager | head -5   # attendu : inactive (dead), pas failed
```

### 2.5 Gain disque estimé

Le gain n'est pas immédiat : la première rotation déplace 86 Mo dans des `.1` non compressés (`delaycompress`), la compression arrive une semaine plus tard. Régime permanent, estimé sur le débit mesuré de `news.log` (3,2 Mo/semaine) et en supposant les autres proportionnels : environ **8 à 10 Mo retenus** pour l'ensemble contre 86 Mo aujourd'hui, soit **~75 Mo libérés à J+14**, puis une croissance bornée au lieu de +14 Mo/mois.

À côté, deux gisements plus gros repérés pendant la lecture, hors logrotate :
- `/opt/crete-direct-instagram/out/` : **517 Mo, 109 répertoires datés depuis le 08/06**, alimenté chaque matin par `render-beach-day.sh` (5 PNG par jour) qui ne publie plus rien depuis le 10/08 (section 3). Purger au delà de 14 jours : `find /opt/crete-direct-instagram/out -maxdepth 1 -type d -name '2026-*' -mtime +14 -exec rm -r {} +` après avoir vérifié que rien ne relit ces dossiers (`grep -rn "instagram/out" /etc/cron.d /var/spool/cron/crontabs/root /opt/crete-direct-instagram/scripts | grep -v render-beach`). Gain estimé : ~450 Mo.
- Journal systemd 184 Mo : `kairos-disk-cleanup.sh` (dimanche 01:00 UTC) fait déjà `journalctl --vacuum-time=7d`. Rien à ajouter.

Le vrai bénéfice de cette section est le premier point de l'objectif : `logrotate.service` cesse d'être rouge dans `systemctl --failed`, donc dans `tasks_health_log.md` où il figure depuis le 22/08.

---

## 3. `render-beach-day` : couper

### 3.1 Ce que dit le log

`[FACT 2026-09-07]` `/etc/cron.d/crete-direct-beach-day` lance `/opt/crete-direct-instagram/bin/render-beach-day.sh` à 05:00 UTC, `MAILTO=""`. Le script enchaîne `generate-beach-carousel.mjs` → `render-beach-png.mjs` → `upload-beach-post.mjs --publish`, chaque étape sur `|| { echo "[FAIL] ..."; exit 1; }`, le tout redirigé vers `/var/log/crete-direct-beach-day.log`.

`tail -50` du log (05, 06 et 07/09) : les trois jours ont la même forme. `generate` et `render` réussissent (5 PNG écrits dans `out/<date>/`), puis :

```
[step] upload
[beach] mode=PUBLISH (LIVE) date=2026-09-07
[beach] FAILED: Instagram token expired (2026-08-10T22:01:42Z).
[FAIL] upload
```

Le 06/09 montre en plus `conditions API failed (forecast API HTTP 503) → fallback sea temp only` : le carrousel est sorti avec `air=?C wind=?`, ce qui aurait été publié tel quel si le token avait été valide.

Le test d'expiration est dans `upload-beach-post.mjs:96` : il lit `expires_at_iso` du fichier pointé par `IG_TOKENS_PATH` (défaut `/opt/cretepulse-video/instagram-tokens.json`) et lève avant tout appel réseau. Le même test existe dans `publish-reel-queue.mjs:65`, `upload-bus-pov.mjs:130` et `audit-social.mjs:39` : c'est le même fichier de token pour toute la chaîne Instagram.

Donc : 28 jours de rendus pour rien, un `exit 1` quotidien que personne ne voit (`MAILTO=""`), et 5 PNG de plus dans `out/` chaque matin.

### 3.2 Décision : couper, comme les autres

Recommandation : **commenter la ligne, avec date et raison, sur le modèle exact des lignes voisines** (`crete-direct-daily-carousel`, `crete-direct-weather-swim`, et le commentaire du 26/08 dans la crontab root pour `publish-reel-queue`).

Pourquoi couper plutôt que reposer le token :
- La décision du 26/08 sur `publish-reel-queue.mjs` a déjà tranché sur les mêmes faits : « Instagram pèse 25 visiteurs en 60 jours ». Le beach-day n'a pas été évalué autrement, il a été oublié.
- Reposer un token Meta est un geste humain (section 10) avec une durée de vie de 60 jours : sans procédure de renouvellement, on retrouvera la même panne en novembre. La coupe est réversible en une ligne quand ce prérequis sera traité.
- Le rendu continue de consommer Open-Meteo et Playwright chaque matin pour un artefact que rien ne consomme.

Édition de `/etc/cron.d/crete-direct-beach-day` (fichier complet après édition) :

```
# Crete Direct - "Plage du jour" (Beach of the day) quotidien (Meta IG feed+story + FB Page)
# 05:00 UTC = 08:00 Athens. Remplace weather-swim (coupé 18/06/2026, refonte slide conditions).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""
# COUPE 2026-09-07 : le token Meta est expire depuis le 10/08 (instagram-tokens.json, expires_at_iso).
# Le script rendait 5 PNG par jour puis sortait en [FAIL] upload sans que personne le voie
# (MAILTO vide). Meme motif que la coupe de publish-reel-queue le 26/08 : Instagram pese
# 25 visiteurs en 60 jours. 517 Mo de rendus dans out/ au 07/09. Pour relancer : reposer un
# token long-lived dans le fichier IG_TOKENS_PATH (voir spec ops-vps-hygiene section 10) et
# decommenter.
# 0 5 * * * root /opt/crete-direct-instagram/bin/render-beach-day.sh
```

Puis la purge de `out/` (section 2.5). Vérification : le 08/09 à 05:05 UTC, `tail -3 /var/log/crete-direct-beach-day.log` doit toujours montrer le bloc du 07/09, et `ls /opt/crete-direct-instagram/out | grep 2026-09-08` doit être vide.

Si François choisit au contraire de reposer le token : ne rien changer au cron, exécuter la procédure de la section 10, puis `bash /opt/crete-direct-instagram/bin/render-beach-day.sh` à la main et lire `[ok] done` dans le log. Dans ce cas, envelopper la ligne avec `run-cron.sh` (section 5) pour que le prochain `[FAIL]` sonne.

---

## 4. systemd : un échec d'unité doit produire un message

### 4.1 État mesuré

`[FACT 2026-09-07]` Les six unités `cretepulse-*.service` (`airbnb-ingest`, `airbnb-articles`, `diavgeia`, `eurostat-tourism`, `fraport-chq`, `hcaa-crete`) ont la même forme : `Type=oneshot`, `User=cretepulse`, `After=network-online.target`, `StandardOutput=append:/var/log/cretepulse-content/<nom>.systemd.log`, `TimeoutStartSec=600` (1 800 pour l'ingest, 900 pour les articles). Aucune ne porte `Restart=`, `OnFailure=`, ni de dépendance sur Docker. `grep -rl OnFailure /etc/systemd/system/` ne renvoie rien : le mécanisme n'est utilisé nulle part sur la machine.

`cretepulse-fraport-chq.service` : `Result=exit-code`, `ExecMainStatus=1`, sortie le 17/08 13:23 UTC. Fin de `/var/log/cretepulse-content/fraport-chq.systemd.log` : `connection to server at "localhost" (::1), port 5433 failed: Connection timed out`. Postgres est le conteneur `cretepulse-postgres` (Up 2 weeks, healthy) : la panne était transitoire, l'unité l'a prise en pleine face et reste rouge jusqu'au prochain tir du timer, le 15/09 09:09 UTC. `cretepulse-eurostat-tourism` a fait la même chose et est repassée verte seule le 05/09.

`systemd 255` (Ubuntu 24.04.3). `pg_isready` est présent dans `/usr/bin`.

### 4.2 Design

Deux mécanismes complémentaires, pas un seul :

**a) `OnFailure=cretepulse-notify@%n.service`** sur les six unités : c'est ce qui transforme un échec en message. Il ne répare rien, il prévient.

**b) Attendre Postgres avant de démarrer**, sur les unités qui l'utilisent : c'est ce qui aurait évité l'échec du 17/08. Un `Restart=on-failure` réglerait le symptôme (retenter dans 10 minutes) mais retenterait aussi sur une vraie erreur de code. `[HYP]` systemd 255 accepte `Restart=` sur `Type=oneshot` (autorisé depuis la version 254 d'après les notes de version ; à confirmer par `systemd-analyze verify` après édition, et se rabattre sur b) seul si l'unité est refusée). Recommandation : **poser b) sur toutes, et `Restart=on-failure` avec `RestartSec=600` et un plafond, comme filet secondaire**.

Drop-in commun plutôt que six éditions :

```bash
mkdir -p /etc/systemd/system/cretepulse-common.d   # ne fonctionne pas : les drop-ins par glob n existent pas
```

⛔ systemd n'a pas de drop-in par motif de nom. Il faut un répertoire `<unité>.service.d/` par unité. Six fois le même fichier, posé par une boucle :

```bash
for u in airbnb-ingest airbnb-articles diavgeia eurostat-tourism fraport-chq hcaa-crete; do
  d=/etc/systemd/system/cretepulse-$u.service.d
  mkdir -p "$d"
  cat > "$d/10-fiabilite.conf" <<'EOF'
# Pose le 07/09/2026 (spec ops-vps-hygiene, section 4).
# OnFailure : un echec devient un message Telegram, au lieu d attendre le prochain
# passage de Tasks-Health le samedi.
# After/Wants docker : ces jobs lisent cretepulse-postgres (Docker, port 5433). Le 17/08
# fraport-chq a demarre pendant un redemarrage de Postgres et est reste failed 4 semaines.
# ExecStartPre : attendre que Postgres reponde, 3 min au plus, sinon echec explicite.
[Unit]
OnFailure=cretepulse-notify@%n.service
After=docker.service network-online.target
Wants=docker.service
StartLimitIntervalSec=1h
StartLimitBurst=3

[Service]
ExecStartPre=/usr/bin/timeout 180 /bin/bash -c 'until /usr/bin/pg_isready -h 127.0.0.1 -p 5433 -q; do sleep 5; done'
Restart=on-failure
RestartSec=600
EOF
done
systemd-analyze verify /etc/systemd/system/cretepulse-*.service 2>&1 | grep -v "^$" || echo "verify OK"
systemctl daemon-reload
systemctl cat cretepulse-fraport-chq.service | grep -E "OnFailure|Restart|ExecStartPre"
```

Remarques :
- `ExecStartPre` tourne sous `User=cretepulse` : `pg_isready` n'a besoin d'aucun droit particulier, il ouvre un socket TCP. `-q` pour ne rien écrire dans le `.systemd.log`.
- `Restart=on-failure` sur un oneshot : si `systemd-analyze verify` répond « Service has Restart= setting other than no, which isn't allowed for Type=oneshot services », retirer les deux lignes `Restart`/`RestartSec` du drop-in et garder le reste. Le comportement utile (attendre Postgres, notifier) ne dépend pas de `Restart`.
- `StartLimitBurst=3` sur 1 h : au pire trois tentatives puis l'unité reste `failed` et `OnFailure` a déjà sonné trois fois. Le `dedup_key` de la section 4.3 ramène les deux suivantes au digest.

### 4.3 L'unité de notification

`/etc/systemd/system/cretepulse-notify@.service` :

```
# Pose le 07/09/2026. Declenchee par OnFailure=cretepulse-notify@%n.service.
# %i = nom de l unite en echec. Tourne en root : /etc/kairos/telegram-channels.env est en 600 root.
[Unit]
Description=Telegram ops : unite %i en echec

[Service]
Type=oneshot
EnvironmentFile=/etc/kairos/telegram-channels.env
ExecStart=/opt/kairos-ops/scripts/notify-unit-failed.sh %i
```

`/opt/kairos-ops/scripts/notify-unit-failed.sh` (le répertoire existe déjà, il porte `backup-vps.sh`) :

```bash
#!/bin/bash
# Usage : notify-unit-failed.sh <unite.service>
# Passe par kairos_telegram, jamais par l API Telegram directement (project_kairos_telegram.md).
set -u
UNIT="$1"
RESULT=$(systemctl show "$UNIT" -p Result --value)
CODE=$(systemctl show "$UNIT" -p ExecMainStatus --value)
QUAND=$(systemctl show "$UNIT" -p ExecMainExitTimestamp --value)
LOG=$(systemctl show "$UNIT" -p StandardOutput --value | sed 's/^append://')
DERNIERES=$(tail -5 "$LOG" 2>/dev/null | cut -c1-200)
/usr/bin/python3 - "$UNIT" "$RESULT" "$CODE" "$QUAND" "$LOG" "$DERNIERES" <<'PY'
import sys
from kairos_telegram import send, Bot, Priority
from kairos_telegram.routing import Channel
unit, result, code, quand, log, dern = sys.argv[1:7]
send(Bot.BOUNCER,
     f"Unité en échec · {unit}",
     f"result={result} code={code}\nsortie {quand}\nlog {log}\n\n{dern}\n\n"
     f"Diagnostic : journalctl -u {unit} ; tail -50 {log}\n"
     f"Après correction : systemctl reset-failed {unit}",
     priority=Priority.WARNING, msg_type="unit_failed",
     channel=Channel.ACTION, dedup_key=f"unit:{unit}")
PY
```

Choix de routage, d'après `/opt/kairos-telegram/ROUTING.md` et les 60 premières lignes de `project_kairos_telegram.md` :
- Bot porteur `BOUNCER` (canal MACHINE par défaut : capteurs, jobs). `channel=Channel.ACTION` explicite, parce que la doctrine classe « panne » en ACTION et que `channel=` gagne toujours sur la table.
- `Priority.WARNING`, pas `URGENT` : URGENT n'est jamais plafonné ni dédoublonné, et un article mensuel qui échoue n'en est pas une.
- `dedup_key=f"unit:{unit}"` (fenêtre 6 h par défaut) : le premier sonne, les répétitions (StartLimitBurst) partent au digest. ⛔ Sans cette clé, trois échecs en une heure consomment trois des douze places ACTION de la journée.
- ⛔ `Priority.HIGH` n'existe pas (INFO/WARNING/URGENT), c'est le bug documenté du 30/07.
- Les variables attendues par `kairos_telegram/config.py` sont `TG_TOKEN_<BOT>` et `TG_CHAT_ID` : présentes dans `/etc/kairos/telegram-channels.env` (`TG_TOKEN_BOUNCER=`, `TG_CHAT_ID=`, `TG_OPS_*` lues ce jour par nom, jamais par valeur).

Test sans casser quoi que ce soit :

```bash
chmod 755 /opt/kairos-ops/scripts/notify-unit-failed.sh
systemctl daemon-reload
systemctl start cretepulse-notify@cretepulse-fraport-chq.service   # l unite est reellement failed : le message est vrai
journalctl -u cretepulse-notify@cretepulse-fraport-chq.service --no-pager | tail -5
python3 /opt/kairos-telegram/scripts/messages.py --help    # relire ce qui est parti si besoin
```

### 4.4 `reset-failed` après diagnostic

Ordre imposé : lire, puis remettre à zéro. Jamais l'inverse.

```bash
tail -30 /var/log/cretepulse-content/fraport-chq.systemd.log
tail -30 /var/log/cretepulse-content/fraport-chq-traffic.log   # le log applicatif : l article d aout a-t-il ete produit ?
```

`[FACT 2026-09-07]` `journalctl -u cretepulse-fraport-chq.service` ne contient plus rien (journal purgé à 7 jours par `kairos-disk-cleanup.sh`) ; le `.systemd.log` est la seule trace. Le timer a tiré le 15/08 09:01 et le processus est sorti le 17/08 13:23, soit deux jours pour un `TimeoutStartSec=600` : `[HYP]` un lancement manuel le 17/08 a remplacé l'échec du 15/08. Sans importance pour le correctif, mais l'article Fraport d'août n'a probablement jamais été écrit : à vérifier dans le log applicatif avant de décider de le rattraper.

Puis :

```bash
systemctl reset-failed cretepulse-fraport-chq.service
systemctl --failed --no-pager      # attendu : 0 unite si la section 2 est faite
```

Pour valider tout le montage sans attendre le 15/09 : `systemctl start cretepulse-fraport-chq.service` lance le job réel (un appel Claude, un article). À faire seulement si le log applicatif montre que l'article d'août manque ; sinon attendre le timer et vérifier le 15/09 à 09:15 UTC.

---

## 5. Crons à vide : décision, convention, wrapper

### 5.1 Les quatre, avec ce que disent les logs

**a) `enrich-daily.py`**, `/etc/cron.d/crete-direct`, 04:00 UTC, log `/var/log/cretepulse-enrich-daily.log`.
`[FACT]` Les 5 derniers passages lus : `[enrich] 0 featured restaurants / 0 beaches / 0 hikes / Done: 0 OK, 0 failed`. Le script sélectionne les POI non enrichis (`LIMITS = {"food_places": 20, "beaches": 10, "hikes": 5}`). Le fichier a été modifié le 26/08 07:31 (`enrich-daily.py.bak-20260826` à côté), et les 8 runs à zéro commencent après cette date.
Décision : **garder, avec « rien à faire » remonté**, parce que de nouveaux POI arrivent (guides, scraper) et que le passage à vide coûte trois `SELECT`. Préalable obligatoire : `diff /opt/cretepulse/enrich-daily.py.bak-20260826 /opt/cretepulse/enrich-daily.py` pour établir que le zéro est « tout est enrichi » et pas une régression du 26/08 dans la requête. Si le diff touche le `WHERE`, c'est un bug, pas un cron à vide.
Code : `sys.exit(3)` quand les trois compteurs valent zéro.

**b) `capture-airbnb-facts.mjs`**, crontab root, 05:20 UTC, log `/var/log/cretepulse-stays-capture.log`.
`[FACT]` Chaque jour : `2 annonce(s) a traiter` puis `{"id":2,...,"why":"no airbnb_url"}`, `{"id":3,...}`, `ok=0 skipped=2 failed=0`. Le script fait ce qu'il doit ; ce sont les deux annonces Stays qui n'ont pas d'URL Airbnb en base.
Décision : **réparer côté données, humain** (section 10 : François renseigne `airbnb_url` pour les annonces 2 et 3, ou confirme qu'elles n'en ont pas). En attendant : garder, `process.exit(3)` quand `ok=0 && failed=0 && skipped>0`, et le libellé du digest dit précisément « 2 annonces sans airbnb_url ». Si François confirme qu'aucune annonce n'a d'URL, couper avec commentaire daté.

**c) `affiliate-autosend.mjs`**, `/etc/cron.d/crete-direct-affiliate`, lun-ven 11:30 UTC, log `/var/log/affiliate-autosend.log`.
`[FACT]` Chaque passage : `0 candidats vitrine, budget du jour 8 / index dedup: 186 emails, 202 domaines bloques / termine: 0 envoi(s)`. Le gisement est épuisé : même diagnostic que `find_backlink_targets` coupé le 26/08 (« le gisement institutionnel est EPUISE, ce n'est PAS un probleme de budget »).
Décision : **désarmer avec commentaire daté**. `affiliate-detect.py` (réponses, toutes les 15 min) et `affiliate-digest.mjs` (16:40) restent : ils servent les 186 déjà contactés.
Édition dans `/etc/cron.d/crete-direct-affiliate` :
```
# COUPE 2026-09-07 : gisement epuise, 0 candidat vitrine a chaque passage depuis des semaines
# (186 emails connus, 202 domaines bloques, budget 8 jamais entame). Meme diagnostic que
# find_backlink_targets le 26/08. affiliate-detect et affiliate-digest RESTENT actifs.
# Pour relancer : ajouter des sources de candidats dans lib/affiliate-places.mjs, puis decommenter.
# 30 11 * * 1-5 root cd /opt/crete-direct-instagram && set -a && . ./.env && set +a && DRY_RUN=0 node scripts/affiliate-autosend.mjs >> /var/log/affiliate-autosend.log 2>&1
```

**d) `crete-direct-social-promo`**, `/etc/cron.d/crete-direct-social-promo`, mar/ven 08:00 UTC, log `/var/log/crete-direct-social-promo.log`.
`[FACT]` Dernière publication réelle le 03/07 (`IG posted explore-3-filter`). Depuis le **07/07** (pas le 18/08 : le log remonte plus loin que le ticket), chaque passage écrit `IG: rien à publier aujourd'hui`. 18 passages à vide consécutifs. Et il publie sur Instagram : depuis le 10/08 il échouerait sur le token s'il avait quelque chose à publier.
Décision : **désarmer avec commentaire daté**. Le fichier n'a ni `SHELL` ni `PATH` : profiter de l'édition pour les ajouter, par cohérence avec les 14 autres.
```
# Posts promo IG @cretedirect (pub manuelle reframée feed) - mardi+vendredi 11:00 Athens
# COUPE 2026-09-07 : « rien a publier » a chaque passage depuis le 07/07 (18 passages, derniere
# publication le 03/07), et le token Meta est expire depuis le 10/08. Pour relancer : reposer
# le token (spec ops-vps-hygiene section 10), alimenter la file de promo.mjs, decommenter.
# 0 8 * * 2,5 root cd /opt/crete-direct-social-promo && /usr/bin/node promo.mjs publish-ig-due >> /var/log/crete-direct-social-promo.log 2>&1
```

### 5.2 Convention d'exit code

Trois valeurs, pour tous les scripts lancés par cron sur crete.direct :

| Code | Sens | Ce que fait le wrapper |
|---|---|---|
| `0` | a tourné et a produit quelque chose | ligne `ok`, compteur de vide remis à zéro |
| `3` | a tourné, rien à faire (aucune ligne à traiter, gisement vide, rien à publier) | ligne `noop`, compteur de vide +1, digest quand le compteur atteint 7 puis tous les 7 |
| autre | échec | ligne `fail`, Telegram ACTION avec dedup |

`3` est choisi parce qu'il n'est pris ni par bash (`1`, `2`, `126`, `127`), ni par `timeout` (`124`), ni par `flock -n` (`1`), ni par `claude-capped.sh` (`98`, `99`), ni par l'agent triathlon (`65`, `75`).

Les scripts qui adoptent la convention dans cette spec : `enrich-daily.py`, `capture-airbnb-facts.mjs`. Les autres gardent leur `0` et sont simplement enveloppés ; un script qui ne distingue pas encore « fait » de « rien à faire » est un `ok` permanent, ce qui est le comportement actuel, sans régression.

### 5.3 Le wrapper `run-cron.sh`

Pourquoi pas `/opt/scrapper/scripts/run_with_notify.sh`, qui existe déjà et fait presque cela : il commence par `cd /opt/scrapper && source venv/bin/activate && source .env.local`, ne prend qu'un `script.py` relatif à `/opt/scrapper/scripts/`, détecte le « significatif » par grep de mots anglais dans les 5 dernières lignes, et notifie par `notify_telegram.py` (l'ancienne voie, avant les 3 canaux). Il est spécifique au scrapper. Le généraliser reviendrait à le réécrire.

`/opt/kairos-ops/scripts/run-cron.sh` :

```bash
#!/bin/bash
# Usage : run-cron.sh <nom> <fichier-log> '<commande shell>'
# Ecrit une ligne par passage dans /var/log/cretepulse-cron-status.log et envoie Telegram
# sur echec. La commande garde son propre log (>> fichier-log), inchange.
# Convention de sortie : 0 fait · 3 rien a faire · autre echec (spec ops-vps-hygiene 5.2).
set -u
NOM="$1"; LOGF="$2"; CMD="$3"
STATUS=/var/log/cretepulse-cron-status.log
ETAT=/var/lib/kairos-cron; mkdir -p "$ETAT"
DEBUT=$(date -u +%FT%TZ); T0=$(date +%s)
/bin/bash -c "$CMD" >> "$LOGF" 2>&1
RC=$?
DUREE=$(( $(date +%s) - T0 ))
NOOP_F="$ETAT/$NOM.noop"
case "$RC" in
  0) S=ok;   echo 0 > "$NOOP_F"; N=0 ;;
  3) S=noop; N=$(( $(cat "$NOOP_F" 2>/dev/null || echo 0) + 1 )); echo "$N" > "$NOOP_F" ;;
  *) S=fail; N=$(cat "$NOOP_F" 2>/dev/null || echo 0) ;;
esac
DERN=$(tail -1 "$LOGF" 2>/dev/null | tr '\t|' '  ' | cut -c1-160)
printf '%s|%s|%s|%s|%s|%s|%s|%s\n' "$DEBUT" "$NOM" "$S" "$RC" "$DUREE" "$N" "$LOGF" "$DERN" >> "$STATUS"

notif() {  # canal, priorite, titre, corps, dedup
  set -a; . /etc/kairos/telegram-channels.env; set +a
  /usr/bin/python3 - "$@" <<'PY'
import sys
from kairos_telegram import send, Bot, Priority
from kairos_telegram.routing import Channel
ch, pr, titre, corps, dk = sys.argv[1:6]
send(Bot.BOUNCER, titre, corps, priority=getattr(Priority, pr), msg_type="cron_status",
     channel=getattr(Channel, ch), dedup_key=dk)
PY
}
if [ "$S" = fail ]; then
  notif ACTION WARNING "Cron en échec · $NOM" "code $RC après ${DUREE}s\nlog $LOGF\n$DERN" "cron:$NOM"
elif [ "$S" = noop ] && [ $((N % 7)) -eq 0 ]; then
  notif DIGEST INFO "Cron sans travail · $NOM" "rien à faire depuis $N passages consécutifs\n$DERN" "cron-noop:$NOM"
fi
exit "$RC"
```

Format de la ligne de statut, un enregistrement par passage, séparateur `|`, huit champs :

```
2026-09-08T04:00:01Z|enrich-daily|noop|3|4|9|/var/log/cretepulse-enrich-daily.log|[enrich-daily] Done: 0 OK, 0 failed
début UTC | nom | ok/noop/fail | code | durée s | vides consécutifs | log | dernière ligne du log (160 car., | et tab remplacés)
```

Le `|` et la tabulation sont retirés de la dernière ligne pour que `awk -F'|'` reste juste. Le compteur de vides est compté en passages, pas en jours : pour un cron quotidien c'est pareil, pour `writer-v2` (6 passages par jour) le digest à 7 tombe au deuxième jour, ce qui est voulu.

Pose et permissions :

```bash
install -m 755 -o root -g root run-cron.sh /opt/kairos-ops/scripts/run-cron.sh
touch /var/log/cretepulse-cron-status.log && chmod 644 /var/log/cretepulse-cron-status.log
```

⛔ Le wrapper tourne en root (les crons crete.direct sont tous `root`). `/etc/kairos/telegram-channels.env` est en 600 root : il n'est sourcé que dans `notif`, jamais exporté à la commande enveloppée.

### 5.4 Lignes à envelopper

Transformation mécanique : `cd X && ... >> LOG 2>&1` devient `/opt/kairos-ops/scripts/run-cron.sh NOM LOG 'cd X && ...'`. Les guillemets simples de la commande d'origine, s'il y en a, passent en `'"'"'` ou en guillemets doubles.

Lot 1 (cette spec), dans l'ordre :
1. `/etc/cron.d/crete-direct` : `writer-v2` (nom `writer-v2`), `guide-writer` ×2 (`guide-writer`), `guide-planner`, `enrich-daily`, `scrape-events-seed`.
2. Crontab root : `capture-airbnb-facts` (nom `stays-capture`), `buses.py` (`bus-scraper`), `buses/alerts.py` (`bus-alerts`), `alert-prepare.mjs` (`alert-prepare`).
3. `/etc/cron.d/cretepulse-daily-generators` : `daily-weather`, `daily-news`.
4. `/etc/cron.d/cretepulse-daily-video` : `video-weather`, `video-news`.
5. `/etc/cron.d/kairos-cretepulse` : `weather` (horaire), `news` (30 min), `health` (15 min), `photos`, `telegram`.

Exemple pour la première ligne de `/etc/cron.d/crete-direct` :

```
15 */4 * * * root /opt/kairos-ops/scripts/run-cron.sh writer-v2 /var/log/cretepulse-writer.log 'cd /opt/cretepulse && source venv/bin/activate && BATCH_SIZE=1 MAX_CLAUDE_CALLS_PER_RUN=2 flock -n /run/lock/cretepulse-writer.lock python3 writer-v2.py'
```

(`MAX_CLAUDE_CALLS_PER_RUN=2` et non `1` : c'est le budget du retry de la section 8.)

⛔ `flock -n` sort en `1` quand le verrou est pris : avec le wrapper, un chevauchement deviendrait un `fail` sonné. Pour `writer-v2` c'est acceptable (6 passages/jour, un chevauchement est une anomalie réelle). Pour `news.py` toutes les 30 min il n'y a pas de flock aujourd'hui, rien ne change.

Hors lot : les 11 lignes `flux/` de la crontab root (elles écrivent toutes dans `flux.log` et ont leur propre `watchdog.py` toutes les heures), les machines outreach `detect_replies` (toutes les 15 min, quatre machines, même pattern, à traiter quand la première semaine de statut aura montré que le volume de lignes est tenable : 4 × 96 = 384 lignes/jour).

### 5.5 Ce que Tasks-Health lira ensuite

`~/.claude/scripts/tasks-health-weekly.mjs` (poste, samedi 08:00), fonction `vps()` : aujourd'hui un seul `ssh` qui renvoie `systemctl --failed`. Ajouter un second `ssh` qui renvoie, pour les 8 derniers jours, la dernière ligne par nom :

```bash
awk -F'|' -v seuil="$(date -u -d '8 days ago' +%FT%TZ)" '$1 >= seuil { d[$2]=$0 } END { for (n in d) print d[n] }' /var/log/cretepulse-cron-status.log
```

et la liste des noms attendus, déduite des fichiers cron eux-mêmes (aucun registre à tenir à la main) :

```bash
grep -hoE "run-cron\.sh [A-Za-z0-9_-]+" /etc/cron.d/* /var/spool/cron/crontabs/root 2>/dev/null | awk '{print $2}' | sort -u
```

Le rapport gagne trois lignes sous « VPS » : `N cron(s) en échec au dernier passage` (statut `fail`), `N cron(s) sans travail depuis ≥ 7 passages` (colonne 6 ≥ 7), `N cron(s) muets` (nom attendu sans ligne depuis 8 jours). Et la ligne « ⛔ Angle mort : les crontab du VPS ne gardent aucun code de retour » est supprimée du script (ligne 104) et de l'en-tête de `tasks_health_log.md` si elle y est. Elle ne sera plus vraie.

---

## 6. Doublon des scrapers d'événements

`[FACT 2026-09-07]` Trois choses portent le mot « events », deux seulement font le même travail :

| Quoi | Où | Quand | Commande | Utilisateur | Trace |
|---|---|---|---|---|---|
| `crete-content-scraper.timer` | systemd | toutes les 3 h (`0/3:00`, `Persistent`, délai aléatoire 5 min) | `/opt/crete-content-bot/.venv/bin/python -m scraper.run` | `cretepulse` | `/var/log/crete-content-bot/scraper.log` + journal + `systemctl --failed` |
| `/etc/cron.d/crete-events-scraper` | cron | 05:00 UTC | la même : `cd /opt/crete-content-bot && .venv/bin/python -m scraper.run` | `root` | `/var/log/crete-events-scraper.log`, aucun code de retour |
| `scrape-events.py` dans `/etc/cron.d/crete-direct` | cron | lundi 06:00 | seeder d'événements annuels récurrents (`ANNUAL_EVENTS`, « Inserted 0 new annual events, Total 810 ») | root | `/var/log/cretepulse-events.log` |

Le troisième n'est pas un doublon : il sème des fêtes calendaires, il ne scrape rien. Il reste.

Entre les deux premiers, **garder le timer systemd, retirer le cron** :
- Même code, même sources (`anatolh-ekdiloseis`, `anatolh-politismos-sitia`, `digitalcrete-events`, `rethnea-events`, `haniotika-politismos`), même base. Le cron de 05:00 n'apporte que son horaire, et le timer passe déjà à 03:00 et 06:00.
- Le timer a un code de retour visible (`systemctl --failed`, déjà lu par Tasks-Health), `Persistent=true` (rattrape un passage manqué), un `TimeoutStartSec=1800`. Le cron n'a rien de tout cela.
- Le cron tourne en **root** dans un arbre dont le service est propriétaire en `cretepulse` : tout fichier de cache ou d'état créé par le passage root devient inaccessible en écriture au service. `[HYP]` Non observé dans les logs lus, mais c'est la panne classique de ce montage.
- Chaque passage dure 15 à 24 minutes (journal du 06 et 07/09) et 1 à 1,5 min CPU. Retirer le cron enlève un neuvième passage quotidien.

Édition de `/etc/cron.d/crete-events-scraper` :

```
# COUPE 2026-09-07 : doublon exact de crete-content-scraper.timer (systemd, toutes les 3 h,
# meme commande, meme base), qui a un code de retour lu par Tasks-Health et tourne sous
# l utilisateur cretepulse au lieu de root. Le journal vit dans /var/log/crete-content-bot/scraper.log.
# 0 5 * * * root cd /opt/crete-content-bot && set -a && . .env && set +a && .venv/bin/python -m scraper.run >> /var/log/crete-events-scraper.log 2>&1
```

Vérification le lendemain : `ls -la /var/log/crete-events-scraper.log` ne bouge plus (mtime du 07/09 05:16), et `grep TOTAL /var/log/crete-content-bot/scraper.log | tail -8` montre huit passages.

Question posée mais non tranchée ici : huit passages de 20 minutes par jour pour `published: 0 ou 1` par passage. Passer le timer à `0/6:00` diviserait le coût par deux sans perte visible. C'est un réglage éditorial, à décider séparément.

---

## 7. Source de vérité des crons : le VPS

### 7.1 Dérive mesurée

`[FACT 2026-09-07]`
- `~/cretepulse/crete-direct.cron` (poste) : `15 0 * * *`, `BATCH_SIZE=2 MAX_CLAUDE_CALLS_PER_RUN=2`. Il est octet pour octet le contenu de `/etc/cron.d/crete-direct.bak-2026-07-22` sur le VPS : la copie poste date du 22/07 et n'a pas suivi le passage à `15 */4` `BATCH_SIZE=1`.
- `~/cretepulse/claude-capped.sh` md5 `20b19a27ffdc...` ; `/opt/cretepulse-content/bin/claude-capped.sh` md5 `31d6efe00f43...`. Le diff est un seul bloc : la version VPS crée le compteur et son verrou en `0666` sous `umask 000`, avec un commentaire qui explique pourquoi (writer-v2 tourne en root, les services `cretepulse-*` en `cretepulse`, le premier arrivé du jour verrouillait les autres en 644). La version poste ne l'a pas. **Le VPS est en avance, le poste est périmé.**
- `/opt/cretepulse/claude-capped.sh` n'existe pas et n'a pas à exister : `writer-v2.py:27` pointe `CLAUDE_BIN` vers `/opt/cretepulse-content/bin/claude-capped.sh`.
- `~/cretepulse/headless-caps/auto-daily.mjs` (13/07) importe `./template-auto.mjs` et `./arrosage-vague1.mjs` qui n'existent pas dans le dossier : c'est une copie morte de `/opt/freelance-radar/auto-daily.mjs` (cron `freelance-radar`, hors crete.direct). Aucun appelant (`grep -rln auto-daily ~/cretepulse ~/cretepulse-build/scripts ~/cretepulse-build/package.json` : rien).
- Dépôt : `src/app/api/cron/scrape-events/route.ts` est un no-op depuis le 08/06 (« kept as a no-op so the existing Vercel cron slot stays wired ») ; `vercel.json` ne contient plus aucune entrée `scrape-events` (13 crons listés, aucun ne le cite). Le slot qu'il gardait n'existe plus.
- `CLAUDE.md:25` et `scripts/vercel-ignore.sh:2` justifient la politique de build par « 1 slot Hobby » ; le plan est Pro.

### 7.2 Règle

**Le fichier qui tourne est la vérité.** Sur le VPS : `/etc/cron.d/*` et `crontab -l` (root). Sur le poste : une copie de lecture, jamais éditée à la main, rafraîchie par `scp` et commitée dans le monorepo home (`~/cretepulse/` y est whitelisté). L'agent qui modifie un cron sur le VPS rafraîchit la copie dans la même session. C'est la même règle que celle écrite dans `/etc/cron.d/triathlon-results` le 16/08 (« Un seul endroit, sinon la prochaine divergence passera aussi inaperçue »).

### 7.3 Commandes

Depuis le poste (Git Bash), après les éditions des sections 3, 5 et 6 :

```bash
scp kairos-vps:/etc/cron.d/crete-direct ~/cretepulse/crete-direct.cron
scp kairos-vps:/opt/cretepulse-content/bin/claude-capped.sh ~/cretepulse/claude-capped.sh
ssh kairos-vps 'md5sum /etc/cron.d/crete-direct /opt/cretepulse-content/bin/claude-capped.sh'; md5sum ~/cretepulse/crete-direct.cron ~/cretepulse/claude-capped.sh   # les paires doivent etre identiques
git -C ~ rm -q cretepulse/headless-caps/auto-daily.mjs
```

Ajouter en tête de `~/cretepulse/crete-direct.cron` et de `~/cretepulse/claude-capped.sh` un commentaire d'une ligne : `# MIROIR de kairos-vps:<chemin>, rafraichi par scp. Ne pas editer ici.` (ce qui change le md5 du miroir : vérifier l'identité avant d'ajouter la ligne, ou comparer avec `diff <(tail -n +2 ...)`).

Les autres fichiers de `~/cretepulse/headless-caps/` (`find_*.py`, `find_prospects.py`, tous du 13/07) sont des copies des machines outreach du VPS, hors périmètre de cette spec. 🔎 Repéré, pas touché : même traitement à décider (miroir daté ou suppression).

Dans le dépôt `cretepulse-build`, sur une branche `feat/*`, puis `npm run ship` :
1. `git rm src/app/api/cron/scrape-events/route.ts`. Vérifier avant : `grep -rn "scrape-events" src/ --include=*.ts --include=*.tsx` ne renvoie que le fichier lui-même (mesuré ce jour : un seul résultat, dans `git log`).
2. `CLAUDE.md:25` : remplacer « 1 slot Hobby partagé, les doublons bouchaient la file devant la prod » par « plan Pro depuis <date à lire dans le tableau de bord Vercel> ; la politique reste parce qu'un build Preview est facturé et que le plafond est à 35 $ (`dev_state.md`) ». `scripts/vercel-ignore.sh:2` : même correction dans le commentaire, aucune ligne de logique ne change.

---

## 8. `writer-v2` : JSON invalide

### 8.1 Ce que fait le code aujourd'hui

`[FACT 2026-09-07]` `/opt/cretepulse/writer-v2.py` :
- `claude()` (l. 40-66) : `subprocess.run([CLAUDE_BIN, "-p", prompt, "--model", model], timeout=180)`. Compte les appels dans `_claude_calls`, plafonné par `MAX_CALLS_PER_RUN = min(env MAX_CLAUDE_CALLS_PER_RUN, 2)` (l. 25). Codes 98/99 du wrapper : `ClaudeBudgetExhausted`. Autre code non nul : affiche `claude exit N` et **retourne une chaîne vide**. Exception : retourne une chaîne vide.
- `extract_json()` (l. 69-83) : tente les blocs ```` ``` ```` puis le texte brut ; sinon `None`.
- l. 222-225 : `result = extract_json(claude(prompt, "haiku"))` puis `if not result or "score" not in result: raise RuntimeError("invalid Claude JSON response")`.
- `process_article()` (l. 228) : un article sans titre est marqué `rewritten = true, category = 'filtered'` ; aucun marquage équivalent n'existe pour l'article dont le JSON est invalide.

Conséquences visibles dans `/var/log/cretepulse-writer.log` : le même slug revient d'un passage à l'autre (`wildfires-rage-near-athens-in-evia-and-n` quatre fois de suite, l. 31279-31288 ; `grece-des-vacanciers-evacues-dune-ile-de` deux fois). Un article que Haiku ne sait pas rendre en JSON valide consomme le budget de chaque passage jusqu'à ce qu'un autre article passe devant. Et le message ne distingue pas trois causes différentes : réponse vide (exit non nul avalé), JSON absent, JSON présent sans clé `score`.

### 8.2 Design

Trois changements, tous dans `writer-v2.py`, aucun ailleurs :

1. **Retry 1× avec le même prompt**, dans le bloc l. 222 : si `extract_json` rend `None` ou sans `score`, rappeler `claude(prompt, "haiku")` une fois. Le second appel compte dans `_claude_calls` : c'est pour cela que le cron passe à `MAX_CLAUDE_CALLS_PER_RUN=2` avec `BATCH_SIZE=1` (section 5.4). Si le budget est épuisé, `ClaudeBudgetExhausted` remonte comme aujourd'hui.
2. **Ligne d'échec explicite** après le second échec, avec la cause et la tête de la réponse brute, qui aujourd'hui est jetée :
   `ERROR <slug>: invalid Claude JSON after 2 attempts (cause=<empty|no-json|no-score>, raw[:120]=...)`.
   Sans ce fragment, on ne saura jamais si Haiku refuse (sujets incendies, plusieurs des slugs en échec sont des articles feux de forêt) ou tronque.
3. **Poison pill** : une colonne `rewrite_attempts int not null default 0` sur `news`, incrémentée à chaque `RuntimeError`. À 3 (soit deux passages avec retry), l'article est marqué `rewritten = true, category = 'filtered'` avec une ligne `SKIP <slug>: 3 invalid JSON attempts, filtered`. C'est le chemin qui existe déjà pour les articles sans titre ; on ne crée pas de nouvel état.

Migration : `ALTER TABLE news ADD COLUMN IF NOT EXISTS rewrite_attempts int NOT NULL DEFAULT 0;` via `docker exec -i cretepulse-postgres psql -U postgres -d cretepulse`. Le monitor `monitor-content-freshness.py` (« News translation (writer-v2 /4h) », seuil 12 h) n'est pas touché.

Vérification : après un cycle complet de 24 h, `grep -c "invalid Claude JSON" /var/log/cretepulse-writer.log` sur la journée doit être inférieur au nombre de la veille, et aucun slug ne doit apparaître plus de deux fois dans les lignes `ERROR` de la journée.

---

## 9. Poste : `Kairos-Bus-Herlas-API`

`[FACT 2026-09-07]` Tâche planifiée samedi 05:00, `StartWhenAvailable=True`, `RestartCount=0`, `WakeToRun=False`. Action : `run-hidden.vbs` → `C:\Users\fkerj\cretepulse-bus-gps\.spike\run-herlas-api.cmd` → `buses.py --only herlas` (API officielle KTEL, IP résidentielle requise, le VPS est bloqué). Dernier passage 06/09 09:49 (le poste s'est réveillé à cette heure, `StartWhenAvailable` a rattrapé), résultat `1`. Fin du log `bus-herlas-api.log` : `httpx.ConnectError: [Errno 11001] getaddrinfo failed` : le DNS n'est pas encore prêt au réveil. 4 échecs sur 14 passages.

Correctif natif, aucune ligne de code : le Planificateur sait relancer une tâche qui sort en erreur.

```powershell
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Set-ScheduledTask -TaskName 'Kairos-Bus-Herlas-API' -Settings $s
(Get-ScheduledTask 'Kairos-Bus-Herlas-API').Settings | Select-Object RestartCount, RestartInterval, StartWhenAvailable
```

Condition pour que cela marche : la tâche doit sortir non nulle sur échec. `LastTaskResult = 1` prouve que `run-hidden.vbs` propage le code de `cmd` (`[HYP]` sinon `1` viendrait de `wscript` lui-même ; à confirmer en lisant `run-hidden.vbs`, `WScript.Quit(rc)` doit y être). Si le code n'est pas propagé, ajouter `exit /b %ERRORLEVEL%` à la fin de `run-herlas-api.cmd` et vérifier le VBS.

Vérification : samedi 13/09 après le réveil, `Get-ScheduledTaskInfo 'Kairos-Bus-Herlas-API' | select LastTaskResult` doit valoir `0`, et le log doit montrer une première tentative en `getaddrinfo failed` suivie d'une seconde qui passe, ou une seule qui passe.

---

## 10. Prérequis humains, à part

Aucun agent ne peut faire ces quatre gestes. Chacun a un propriétaire et un butoir ; passé le butoir sans livraison, la décision par défaut s'applique.

| # | Quoi | Qui | Butoir | Défaut si non fait |
|---|---|---|---|---|
| H1 | **Token Meta long-lived** : dans Meta for Developers, générer un User Access Token avec `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_manage_posts` ; l'échanger en long-lived (`GET /oauth/access_token?grant_type=fb_exchange_token`, 60 jours) ; obtenir le Page token ; écrire le fichier JSON pointé par `IG_TOKENS_PATH` dans `/opt/crete-direct-instagram/.env` (défaut `/opt/cretepulse-video/instagram-tokens.json`) en mettant à jour `expires_at_iso` (c'est le champ que testent les quatre scripts). Puis décommenter `crete-direct-beach-day`, `publish-reel-queue` (crontab root), `crete-direct-social-promo`, et noter dans `project_crete_direct_reels.md` la date de la prochaine expiration. | François | 30/09/2026 | Les trois crons Instagram restent coupés ; Instagram est considéré arrêté pour crete.direct et la fiche `project_crete_direct_reels.md` le dit. |
| H2 | **`airbnb_url` des annonces Stays 2 et 3** : renseigner l'URL Airbnb en base (`stays` ou table équivalente, à lire dans `stays-capture/scripts/capture-airbnb-facts.mjs`) ou confirmer qu'elles n'en ont pas. | François | 21/09/2026 | Le cron `stays-capture` est coupé avec commentaire daté « 0 annonce avec airbnb_url ». |
| H3 | **Token Sentry** (projet `kairos`, 403/400 actuels) : régénérer un Auth Token avec `project:read`, `event:read` dans les paramètres du compte, le poser là où le script consommateur le lit. | François | 30/09/2026 | Sentry reste hors boucle ; Tasks-Health et le statut cron sont la seule surveillance, ce qui est le cas aujourd'hui. |
| H4 | **Décision `enrich-daily`** après le diff du 26/08 (section 5.1 a) : si c'est une régression, ticket ; si c'est « tout est enrichi », rien. | Agent d'exécution, puis François si le diff touche le `WHERE` | à l'exécution | Garder avec `noop`. |

Ces quatre lignes vont dans `dev_state.md` avec propriétaire et date, conformément à la règle « No orphan TODO ».

---

## 11. Vérification après exécution

À passer dans l'ordre, tout en lecture seule. Chaque ligne a un résultat attendu.

```bash
# --- VPS ---
ssh kairos-vps '
echo "1. unites en echec (attendu : aucune)"; systemctl --failed --no-legend --plain
echo "2. logrotate (attendu : inactive, pas failed, et 0 error)"; systemctl is-failed logrotate.service; logrotate -d /etc/logrotate.conf 2>&1 | grep -ci "^error"
echo "3. news.log tourne (attendu : .log petit, .log.1 present)"; ls -la /var/log/cretepulse-news.log*
echo "4. drop-ins (attendu : 6 fichiers)"; ls /etc/systemd/system/cretepulse-*.service.d/10-fiabilite.conf | wc -l
echo "5. OnFailure lu par systemd (attendu : cretepulse-notify@%n.service ×6)"; for u in airbnb-ingest airbnb-articles diavgeia eurostat-tourism fraport-chq hcaa-crete; do systemctl show cretepulse-$u.service -p OnFailure --value; done
echo "6. crons coupes (attendu : 4 lignes commentees COUPE 2026-09-07)"; grep -l "COUPE 2026-09-07" /etc/cron.d/crete-direct-beach-day /etc/cron.d/crete-direct-affiliate /etc/cron.d/crete-direct-social-promo /etc/cron.d/crete-events-scraper | wc -l
echo "7. lignes actives restantes qui appellent Instagram (attendu : 0)"; grep -hE "^[^#].*(upload-beach|publish-reel|publish-ig-due)" /etc/cron.d/* /var/spool/cron/crontabs/root | wc -l
echo "8. wrapper en place et journal de statut alimente (attendu : >= 1 ligne par nom apres 24 h)"; ls -la /opt/kairos-ops/scripts/run-cron.sh; awk -F"|" "{print \$2, \$3}" /var/log/cretepulse-cron-status.log | sort | uniq -c
echo "9. noms attendus vs noms vus"; grep -hoE "run-cron\.sh [A-Za-z0-9_-]+" /etc/cron.d/* /var/spool/cron/crontabs/root | awk "{print \$2}" | sort -u
echo "10. rewrite_attempts existe (attendu : 1 ligne)"; docker exec -i cretepulse-postgres psql -U postgres -d cretepulse -tAc "select count(*) from information_schema.columns where table_name='"'"'news'"'"' and column_name='"'"'rewrite_attempts'"'"'"
echo "11. out/ purge (attendu : < 20 repertoires, < 100 Mo)"; ls /opt/crete-direct-instagram/out | wc -l; du -sh /opt/crete-direct-instagram/out
echo "12. disque"; df -h / | tail -1; du -sh /var/log
'
# --- poste ---
md5sum ~/cretepulse/claude-capped.sh; ssh kairos-vps md5sum /opt/cretepulse-content/bin/claude-capped.sh   # identiques (ou identiques hors ligne 1 si le commentaire MIROIR est ajoute)
diff <(ssh kairos-vps cat /etc/cron.d/crete-direct) ~/cretepulse/crete-direct.cron && echo "miroir a jour"
test ! -e ~/cretepulse/headless-caps/auto-daily.mjs && echo "auto-daily supprime"
grep -c "Hobby" ~/cretepulse-build/CLAUDE.md ~/cretepulse-build/scripts/vercel-ignore.sh   # attendu : 0 et 0
test ! -e ~/cretepulse-build/src/app/api/cron/scrape-events/route.ts && echo "route supprimee"
grep -c "Angle mort" ~/.claude/scripts/tasks-health-weekly.mjs   # attendu : 0
node ~/.claude/scripts/tasks-health-weekly.mjs | tail -12   # le bloc VPS montre les 3 nouvelles lignes cron
```

Et un test de bout en bout du signal, une fois, volontairement : `ssh kairos-vps '/opt/kairos-ops/scripts/run-cron.sh test-echec /tmp/test-echec.log "exit 7"'` doit écrire une ligne `test-echec|fail|7` dans le journal de statut et faire arriver un message « Cron en échec · test-echec » sur le canal ACTION. Puis `rm /var/lib/kairos-cron/test-echec.noop /tmp/test-echec.log` (le fichier `.noop` n'est créé que sur `ok`/`noop`, donc probablement absent : `rm -f`).

---

## 12. Effort et ordre

| Ordre | Section | Effort | Pourquoi à cette place |
|---|---|---|---|
| 1 | 2. logrotate | 0,5 h | Retire une unité rouge chaque nuit ; aucun risque ; débloque une lecture propre de `systemctl --failed` pour la suite |
| 2 | 4. systemd OnFailure + notify + reset-failed | 1 h | Dès que c'est posé, tout ce qui casse ensuite pendant l'exécution se signale tout seul |
| 3 | 3. beach-day + purge `out/` | 0,5 h | Coupe un échec quotidien et libère ~450 Mo |
| 4 | 6. doublon scrapers | 0,25 h | Une ligne à commenter |
| 5 | 5. run-cron.sh + décisions des 4 + enveloppement lot 1 | 3 h | Le gros morceau ; les crons coupés en 3 et 6 n'ont pas besoin d'être enveloppés |
| 6 | 8. writer-v2 | 1,5 h | Dépend de `MAX_CLAUDE_CALLS_PER_RUN=2` posé en 5 |
| 7 | 7. miroir poste + dépôt (route, Hobby) | 1 h | Après toutes les éditions VPS, pour ne scp qu'une fois ; la partie dépôt passe par `feat/*` puis `npm run ship` |
| 8 | 9. Herlas | 0,25 h | Une commande PowerShell |
| 9 | 5.5 Tasks-Health | 1 h | En dernier : il a besoin d'au moins un jour de journal de statut pour être testé sur du vrai |
| 10 | 11. vérification | 0,5 h | Et une seconde passe le samedi 13/09 après Tasks-Health et Herlas |

**Total : environ 9,5 h**, en deux séances : VPS (sections 2, 4, 3, 6, 5, 8 : ~6 h 45) puis poste et dépôt (7, 9, 5.5, 11 : ~2 h 45). Les prérequis humains (section 10) courent en parallèle et ne bloquent rien.

---

## Fichiers lus le 07/09/2026

VPS `kairos-vps`, lecture seule :
- `/etc/cron.d/*` (34 fichiers dont 10 `.bak-*`, inertes pour cron car leur nom contient un point) : `affiliate-desc-worker`, `crete-direct`, `crete-direct-affiliate`, `crete-direct-beach-day`, `crete-direct-daily-carousel`, `crete-direct-social-promo`, `crete-direct-weather-swim`, `crete-events-scraper`, `cretepulse-content`, `cretepulse-daily-generators`, `cretepulse-daily-video`, `cretepulse-monitor`, `e2scrub_all`, `freelance-radar`, `john`, `kairos-agents`, `kairos-backup`, `kairos-blog`, `kairos-brain`, `kairos-compta-audit`, `kairos-cretepulse`, `kairos-ical-sync`, `kairos-infra`, `kairos-meta`, `kairos-ml-lab`, `kairos-scrapper`, `kairos-sentinel`, `kairos-veille`, `novai-index-monitor`, `novai-warmup-backup`, `README-kairos`, `sysstat`, `triathlon-results`
- `crontab -l` (root)
- `/etc/logrotate.conf`, `/etc/logrotate.d/*` (21 fichiers)
- `systemctl status logrotate.service`, `systemctl --failed`, `systemctl list-timers`, `systemctl cat cretepulse-{airbnb-ingest,airbnb-articles,diavgeia,eurostat-tourism,fraport-chq,hcaa-crete}.service`, `systemctl cat crete-content-scraper.{service,timer}`, `systemctl show cretepulse-fraport-chq.service`, `journalctl -u crete-content-scraper.service`, `systemctl --version`
- `/var/log/crete-direct-beach-day.log` (tail 50), `/var/log/cretepulse-enrich-daily.log`, `/var/log/cretepulse-stays-capture.log`, `/var/log/affiliate-autosend.log`, `/var/log/crete-direct-social-promo.log`, `/var/log/cretepulse-writer.log` (grep ERROR), `/var/log/crete-events-scraper.log`, `/var/log/crete-content-bot/scraper.log` (grep TOTAL), `/var/log/cretepulse-content/fraport-chq.systemd.log`, `/var/log/cretepulse-news.log` (première ligne, nombre de lignes)
- `ls -la /opt/cretepulse* /opt/*outreach*`, `ls /var/log/cretepulse /var/log/cretepulse-content /var/log/crete-content-bot`, `ls /opt/crete-direct-instagram/out`, `ls /opt/kairos-ops/scripts`, `df -h /`, `du -sh /var/log`, `journalctl --disk-usage`, `docker ps`
- `/opt/crete-direct-instagram/bin/render-beach-day.sh`, `/opt/crete-direct-instagram/scripts/upload-beach-post.mjs` (grep token), `/opt/cretepulse-content/bin/claude-capped.sh`, `/opt/cretepulse/writer-v2.py` (l. 25-95, 205-240, grep), `/opt/cretepulse/enrich-daily.py` (grep), `/opt/cretepulse/scrape-events.py` (en-tête), `/opt/cretepulse-db/monitor-content-freshness.py` (l. 27-41), `/usr/local/bin/kairos-disk-cleanup.sh`, `/opt/scrapper/scripts/run_with_notify.sh`
- `/opt/kairos-telegram/ROUTING.md` (60 premières lignes), `kairos_telegram/config.py` et `sender.py` (grep), énumérations `Bot`, `Priority`, `Channel` via `python3 -c`
- `/etc/kairos/telegram-channels.env` : noms des variables seulement, jamais les valeurs

Poste :
- `~/cretepulse/crete-direct.cron`, `~/cretepulse/claude-capped.sh` (+ md5), `~/cretepulse/headless-caps/` (ls, en-tête de `auto-daily.mjs`)
- `~/.claude/scripts/tasks-health-weekly.mjs`, `~/.claude/projects/C--Users-fkerj/memory/tasks_health_log.md` (40 dernières lignes), `~/.claude/projects/C--Users-fkerj/memory/project_kairos_telegram.md` (60 premières lignes)
- `C:\Users\fkerj\cretepulse-bus-gps\.spike\run-herlas-api.cmd`, `bus-herlas-api.log` (tail), `Get-ScheduledTask` / `Get-ScheduledTaskInfo` pour `Kairos-Bus-Herlas-API`, `Kairos-Tasks-Health`, `Kairos-Social-Publisher`
- Dépôt `~/cp-specs-360` : `src/app/api/cron/scrape-events/route.ts`, `vercel.json`, `CLAUDE.md:25`, `scripts/vercel-ignore.sh:2`, `git log` du fichier route
