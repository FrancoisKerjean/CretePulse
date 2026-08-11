# Rapatriement des photos /stays sur media.crete.direct

## Pourquoi

Les photos des 3 annonces publiees etaient servies par des hotes tiers :
`kairosguest.com` (42 photos) et un bucket Supabase (13 photos). Passer par
`/_next/image` ne cache rien, l'URL d'origine reste dans la chaine de requete :
le code source de la fiche affichait **44 occurrences de « kairos »**, sur la
surface meme destinee a des proprietaires cretois.

Le carrousel mobile du 11/08/2026 a porte ce compte a **110** en mettant les 27
photos dans le DOM au lieu de 5. Meme cause, degre different.

⛔ Regle du projet : aucun branding Kairos visible sur crete.direct.

Le plan etait deja ecrit dans `next.config.ts` : « a retirer quand les photos
seront rapatriees sur media.crete.direct ».

## Les trois etapes, dans cet ordre

Les deux premieres sont **additives** : elles ne changent rien de ce que le site
sert. Seule la troisieme bascule la prod.

| # | Script | Ou | Effet |
|---|--------|----|-------|
| 1 | `1-fetch-photos.sh` | VPS | Copie les photos sous `/opt/cretepulse-media/stays/<slug>/NN-photo.<ext>`. Rien en base. |
| 2 | `2-add-caddy-path.py` | VPS, root | Ajoute `handle_path /stays/*` au bloc `media.crete.direct`. Puis `systemctl reload caddy`. |
| 3 | `3-swap-photos.sh` | VPS | Bascule la colonne `stay_listings.photos`. **Change la prod.** |

```bash
ssh kairos-vps 'bash /tmp/1-fetch-photos.sh'
ssh kairos-vps 'python3 /tmp/2-add-caddy-path.py && systemctl reload caddy'
ssh kairos-vps 'bash /tmp/3-swap-photos.sh --dry-run'   # controle
ssh kairos-vps 'bash /tmp/3-swap-photos.sh'             # bascule
```

Puis, dans le depot, retirer `kairosguest.com` et le bucket Supabase de
`images.remotePatterns` dans `next.config.ts`.

⛔ **Pas avant la bascule** : retirer un hote de `remotePatterns` alors que la
base pointe encore dessus fait repondre 400 a `/_next/image`, et toutes les
photos de la fiche disparaissent.

## Ce qui protege

- **Le nommage vient de la base, jamais d'une liste recopiee.** Les deux scripts
  derivent le chemin de la meme expression SQL : ils ne peuvent pas diverger.
- **La position, pas le nom d'origine.** Les fichiers de l'annonce 2 portaient le
  patronyme du proprietaire. L'ordre d'affichage est preserve, le nom ne l'est pas.
- **L'etape 3 verifie les 55 URL avant d'ecrire.** Une seule qui ne repond pas 200
  et rien n'est touche.
- **Sauvegarde en base avant bascule**, table `stay_listings_photos_bak`. Le retour
  arriere est imprime a la fin de l'etape 3.
- **Caddy est valide avant remplacement.** Il sert tous les sites du VPS : un
  fichier invalide les fait tomber ensemble.

## Etat au 11/08/2026

- Etape 1 : faite. 55 photos, 0 echec, 38 Mo sur `/opt/cretepulse-media/stays/`.
- Etape 2 : a faire.
- Etape 3 : a faire.

⚠️ Les 13 photos de `maison-piscine-makrygialos` sont des PNG de ~2 Mo (26 Mo a
elles seules, contre 7,3 Mo pour les 27 de l'annonce 1). Elles passent par
l'optimiseur d'images, donc le visiteur ne les paie pas en l'etat, mais chaque
transformation est facturee. A convertir en JPEG si la facture Vercel bouge.
