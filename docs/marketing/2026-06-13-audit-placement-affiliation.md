# Audit placement affiliation — crete.direct

Date : 13/06/2026 · Auteur : Claude (DAF/dev) · Statut : **à valider par Kami avant exécution**

But : cartographier chaque template, son intention d'achat et l'affilié idéal, pour
ne placer que ce qui rapporte, là où ça rapporte. Aucune édition tant que la matrice
n'est pas validée.

---

## 1. État des 5 programmes affiliés (revenu réel)

| Programme | Clé `affiliates.ts` | ID actuel | Rapporte ? | Conditions |
|---|---|---|---|---|
| **GetYourGuide** | `tours` | `partner_id=UIHUPYW` | ✅ **OUI** | 8 % commission |
| **DiscoverCars** | `carRental` | `a_aid=Francoiskerjean` | ✅ **OUI** | 70 % booking + 30 % Full Coverage, cookie 365j |
| **FerryHopper** | `ferry` | `affiliate=cretedirect` | ❌ placeholder | dossier envoyé, attente credentials (3 %, cookie 30j) |
| **Booking** | `hotels` | `aid=cretedirect` | ❌ placeholder | pas inscrit (passer par CJ) |
| **Skyscanner** | `flights` | `associateid=cretedirect` | ❌ placeholder | pas inscrit |

**Règle de fer : on ne place PAS un lien non tracké.** Envoyer du trafic vers Booking/
Skyscanner/FerryHopper aujourd'hui = offrir le clic, gagner 0. Les 3 attendent une action
owner Kami (inscriptions). Le lien Skyscanner « live » sur les pages aéroport est une **fuite
à colmater** (trafic offert, zéro tracking).

## 2. Les 4 mécanismes de monétisation du site

1. **DiscoverCars** (`AffiliateBanner type="carRental"`) — affilié auto, 70 %, paie tout seul. Le plus rentable sans effort.
2. **Auto Smart / agence locale** (`CarPromo` → wizard `/car-rental` → lead relay Kami) — couvre les 4 zones de l'île (Chania-ouest, Rethymno, Heraklion-centre, Lasithi-est). Marge potentiellement > DiscoverCars mais traitement manuel (relay WhatsApp).
3. **GetYourGuide** (`AffiliateBanner type="tours"`) — affilié auto, 8 %.
4. **Funnel Kairos** (`RentalCTA`, `AffiliateCTA type="propertyManagement"`) — vers kairosguest.com, pas de l'affiliation mais de l'acquisition gestion.
5. (taxi local via `TaxiCompare` sur pages bus — deals mail directs)

## 3. Matrice placement actuelle vs idéale

Légende intention : 🔴 forte (acheteur prêt) · 🟠 moyenne · ⚪ faible/info

| Template | Intention | Monétisation actuelle | Idéal | Écart |
|---|---|---|---|---|
| `car-rental` (dédiée) | 🔴 voiture | Wizard Auto Smart | + DiscoverCars en **fallback** si zone non couverte / résa instantanée | manque option affilié |
| `airport/[slug]` | 🔴 voiture+vol | CarPromo + **Skyscanner mort** | CarPromo + DiscoverCars ; Skyscanner OFF jusqu'à ID | fuite Skyscanner |
| `buses/[pair]` | 🔴 transport | CarPromo + TaxiCompare | OK (+ ferry si pair côtière, après ID) | bon |
| `getting-around/[route]` | 🔴 transport | CarPromo + **DiscoverCars** + ferryhopper(mort) | **double CTA voiture** à arbitrer ; ferry OFF | cannibalisation |
| `beaches/[slug]` | 🟠 voiture+tours | CarPromo + DiscoverCars + RentalCTA + tours | **triple CTA voiture** à arbitrer + ajouter tours (sorties bateau) | cannibalisation |
| `things-to-do/[city]` | 🔴 tours | **GYG tours** + RentalCTA | OK (+ CarPromo léger) | bon |
| `hikes/[slug]` | 🟠 tours | GYG tours | OK | bon |
| `archaeology/[slug]` | 🟠 tours | GYG tours | OK | bon |
| `where-to-stay/[area]` | 🔴 hôtel | RentalCTA + Kairos | **Booking (OFF)** + Kairos | manque hotels (attend ID) |
| `itineraries/[slug]` | 🔴 voiture+tours | **AUCUNE** | DiscoverCars + GYG tours | **trou majeur** |
| `near-me` | 🟠 voiture | CarPromo (client) | OK | bon |
| `villages` (index) | 🟠 | AUCUNE | tours + voiture légers | trou |
| `villages/[slug]` | 🟠 | Kairos seul | + GYG tours | trou tours |
| `daily` | 🟠 planning | **AUCUNE** | GYG tours + DiscoverCars | trou |
| `food/[slug]` | ⚪ | AUCUNE | GYG (tours food/wine) léger | trou mineur |
| `beaches/today` | 🔴 plage du jour | **AUCUNE** | DiscoverCars (s'y rendre) | trou |
| `beaches/best-for/[activity]` | 🟠 | AUCUNE | tours (activité) | trou |
| `beaches/near/[village]` | 🟠 | AUCUNE | DiscoverCars | trou |
| `visit/[month]` | 🟠 planif | AUCUNE | tours + voiture | trou |
| `weather/*` | ⚪ | AUCUNE | rien (faible intention) | OK vide |
| `events/[slug]` | ⚪ | AUCUNE | rien ou tours léger | OK vide |
| `compare/[slug]` | 🟠 | RentalCTA | OK | bon |
| `articles/[slug]` | ⚪ blog | RentalCTA | OK | bon |
| `airbnb*` | 🟠 | AUCUNE | Kairos (gestion) + Booking(OFF) | trou Kairos |

## 4. Problèmes prioritaires identifiés

**P1 — Fuite Skyscanner (revenu négatif net).** Lien live sur airport, non tracké : on envoie
de l'intention vol vers Skyscanner gratuitement. Décision : retirer OU laisser jusqu'à inscription.

**P2 — Cannibalisation voiture.** `beaches/[slug]` empile CarPromo (agence locale) + DiscoverCars
+ RentalCTA → 3 CTA voiture concurrents sur une même page. `getting-around` en a 2. Il faut une
**hiérarchie claire** : qui est le CTA primaire (agence locale = marge) vs secondaire (DiscoverCars
= fallback auto). Trop de choix = moins de clics.

**P3 — Trous haute intention non monétisés.** `itineraries/[slug]` (un voyageur qui planifie un
roadtrip = intention voiture maximale) n'a RIEN. Idem `daily`, `beaches/today`. Ce sont les
ajouts au meilleur ROI immédiat des 2 affiliés qui paient.

**P4 — Hotels / flights / ferry : prêts mais bloqués.** Le bandeau `ferry` (copy 4 langues) existe
mais n'est rendu nulle part. `hotels` et `flights` n'ont même pas de copy bandeau. → readiness à
construire, déploiement gardé OFF jusqu'aux IDs.

## 5. Plan d'exécution proposé (après validation matrice)

**Vague A — maximiser les 2 earners (revenu immédiat, aucune dépendance Kami) :**
- A1 : DiscoverCars + GYG sur `itineraries/[slug]` (trou n°1)
- A2 : DiscoverCars sur `beaches/today`, `beaches/near/[village]`, `daily`
- A3 : GYG tours sur `villages/[slug]`, `daily`, `visit/[month]`
- A4 : DiscoverCars en fallback sur la page `/car-rental` (zones non Auto Smart)

**Vague B — arbitrage cannibalisation :**
- B1 : hiérarchiser les CTA voiture (1 primaire + 1 secondaire max par page)

**Vague C — readiness (déploiement OFF jusqu'aux IDs Kami) :**
- C1 : copy bandeau `hotels` (Booking) + `flights` (Skyscanner), 4 langues
- C2 : placer ferry/hotels/flights derrière un flag « ID réel ? » pour activation instantanée
- C3 : décision P1 Skyscanner (retirer le lien mort ou non)

**Owner Kami (le vrai levier structurel) :** finir inscriptions Booking (CJ) + Skyscanner,
récupérer credentials FerryHopper. Sans ça, 3/5 leviers restent à 0.

---

### Décisions attendues de Kami
1. Valider/corriger la matrice §3.
2. P2 — hiérarchie voiture : agence locale primaire partout, DiscoverCars secondaire ? (ou l'inverse selon marge réelle Auto Smart)
3. P1 — on retire le Skyscanner mort des pages aéroport en attendant l'inscription ?
4. Feu vert Vague A pour exécution.
