# Plan de promotion · « Le Tinder de la Crète » (/match)

Hélène Vasilakis, direction marketing Kairos, 12/06/2026

## Le produit et son avantage promotionnel

Le /match n'est pas une page, c'est un **geste filmable**. Un swipe sur une plage turquoise est du contenu vertical natif : la démo du produit EST la créa publicitaire. Aucun autre asset crete.direct n'a cette propriété (les horaires de bus rendent service mais ne se filment pas). Le nom « Le Tinder de la Crète » fait le travail d'accroche tout seul : référence universelle, promesse comprise en une seconde, légèrement transgressive donc partageable.

Audience disponible aujourd'hui (sources : GSC 10/06, Plausible, session_log) :
- Site : 1 357 clics organiques/28j, 74 % du trafic sur /buses
- Facebook : 2e canal de trafic, précédent post groupes bus = 274 pv/7j
- IG/FB @cretedirect : connectés Graph API aujourd'hui, 2 posts publiés, audience à construire
- YouTube @CreteDirect : 2 vidéos daily/jour automatisées
- Newsletter : réparée aujourd'hui, base à construire (1 inscrit)

## Reco principale tranchée

**Le Reel de démo swipe d'abord.** Capture d'écran verticale du vrai geste (pouce qui swipe 4-5 cartes, badge LIKE, écran « C'est un match ! »), 12-18 s, hook texte « Tinder, but for Crete », publié IG + FB via l'API déjà branchée, puis relayé en commentaire dans les groupes FB selon les règles anti-ban du pack du 12/06. C'est le seul canal où le produit se vend en se montrant, et toute l'infra de publication existe depuis ce matin.

## Les 5 actions, par ordre d'exécution

### 1. Reel démo swipe (IG + FB @cretedirect) — J0-J2
- Format : screen-record mobile réel (pas de motion design : l'authenticité du doigt fait la preuve), 1080×1920, 12-18 s.
- Structure : hook 2 s « Tinder, but for Crete 🏖️ » → 4 swipes rapides (un pass, des likes) → « It's a match! » → synthèse 1 s → CTA « crete.direct/match · free, no app ».
- Caption EN courte + hashtags Crète. Lien en bio déjà en place.
- Owner : Kami filme l'écran (30 s de rush suffisent), Claude monte et publie via Graph API sur GO.
- Le même fichier sert TikTok si un compte est ouvert un jour (backlog, pas maintenant).

### 2. Encart /match sur les pages à fort trafic — J0-J1
74 % du trafic est sur /buses et n'a jamais vu le bandeau home. Un encart « Pas encore décidé où aller ? Swipe les 2 296 lieux » (PromoBox existante, lien /match) sur : /buses (et pages paires), /beaches/today, /explore. C'est le levier le moins cher : zéro audience à conquérir, elle est déjà là.
- Owner : brief ci-présent, dev = session Claude sur GO Kami.
- Mesure : event Plausible `match_deck_start` avec referrer interne, avant/après.

### 3. Post groupes Facebook — extension du pack du 12/06 — J2-J14
7e post ajouté au pack existant (mêmes règles anti-ban : 1 groupe/jour, jamais le même texte, lien en commentaire si groupe strict). Angle builder qui a fait les 274 pv du post bus :

**Draft EN (groupes touristes)** :
> I made a little game to solve the "where should we even go?" argument: it shows you beaches, gorges and villages of Crete one by one, you swipe right if you like, left if not. After a few cards it tells you your "match" and builds your list with driving directions. Free, no app, no signup. Made it because my own list was a mess. Happy to hear what your match was!

**Draft FR (groupes francophones)** :
> J'ai fabriqué un petit jeu pour régler la question « on va où demain ? » : il fait défiler plages, gorges et villages de Crète, vous balayez à droite si ça vous plaît. Au bout de quelques cartes il vous donne votre « match » et votre liste avec les itinéraires. Gratuit, sans appli, sans inscription. Curieuse de savoir quel est votre match !

- Owner publication : Kami uniquement, profil perso, calendrier imbriqué dans celui du pack beach-finder (ne pas doubler la cadence : remplacer 2 créneaux du calendrier 14j, pas en ajouter).

### 4. Outro vidéos daily YouTube — J3-J7
Les 2 vidéos/jour se terminent sur le CTA générique. Variante d'outro mentionnant « Find your perfect spot: crete.direct/match » en alternance 1 jour sur 2 pendant 14 jours.
- Owner : modification template Remotion VPS (session Claude sur GO), réversible.

### 5. Newsletter et email de sélection — déjà en place, à armer
L'email de sélection est lui-même un canal : chaque destinataire peut transférer sa liste. Ajout backlog V2 (pas maintenant) : bouton « Partager ma sélection » dans la synthèse = boucle virale produit. À décider après lecture des chiffres J+14.

## Ce qu'on ne fait PAS maintenant
- Pas de budget pub payant : le produit n'a pas encore prouvé sa rétention (critère 25 % au 26/06).
- Pas de TikTok/compte neuf à gérer : les canaux existants suffisent pour le test.
- Pas de PR/presse : prématuré, à revoir si le Reel performe.

## Mesure (Plausible, 14 jours)
- `match_deck_start` par source (utm sur le Reel : `?utm_source=ig&utm_campaign=tinder-reel`)
- Funnel complet : deck_start → match_shown → match_clicked → synthesis_route_clicked / car promo / email
- Cibles raisonnables J+14 : 500 deck_start cumulés, 25 % match_clicked/deck_start, 10 emails de sélection envoyés, 1er lead voiture source=match-synthesis.

## Séquence des 48 prochaines heures
1. Kami : 30 s de screen-record du swipe sur son téléphone (rush brut suffit).
2. Claude : montage Reel + publication API sur GO + encarts pages trafic sur GO.
3. Kami : remplace 2 créneaux du calendrier groupes FB par le post match (drafts ci-dessus).
