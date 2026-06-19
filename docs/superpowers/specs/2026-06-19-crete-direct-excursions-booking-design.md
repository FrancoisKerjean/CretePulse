# crete.direct — Excursions : réservation orchestrée (V1)

- **Date** : 2026-06-19
- **Statut** : design validé, prêt pour plan d'implémentation
- **Repo** : CretePulse (site crete.direct, Next.js + Supabase + Vercel)
- **Pattern parent** : car-rental wizard (`docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md`) — réutilisé et étendu

## 1. Problème

Le système d'affiliation actuel (`/affiliate` + redirect tracké `/go/[slug]`) n'attribue qu'au **clic**. Une fois le visiteur redirigé chez le partenaire, crete.direct ne voit plus rien : ni la réservation, ni le montant. La commission repose sur la bonne foi du partenaire (sous-déclaration possible) et n'est pas mesurable.

On veut passer d'un **référent passif** (clic) à un **orchestrateur de réservation** : crete.direct capte la commande, chiffre le montant et sa commission, fait **valider la dispo par le fournisseur**, puis confirme au client. La preuve de conversion devient incontestable.

## 2. Objectif V1

Pour la catégorie **tours & excursions** uniquement, permettre à un voyageur sur crete.direct de commander une excursion curée, et orchestrer la validation fournisseur en **semi-manuel** (opérateur dans la boucle, sans paiement en ligne, sans API WhatsApp Business).

## 3. Décisions de cadrage (verrouillées)

| Sujet | Décision |
|---|---|
| Mécanisme | Lead capté → **le fournisseur valide** (Oui / Non / Contre-proposer), puis client notifié. Pas de redirection. |
| Point d'entrée | **Contenu crete.direct** : annuaire d'excursions curées (+ greffe ultérieure sur `things-to-do/[city]`). |
| Périmètre | **Tours & excursions** seulement. Car-rental garde son wizard dédié. |
| Curation | Prestataires/excursions **curés** par Kami (const TS). **Pas de self-service** en V1. |
| WhatsApp | **Semi-manuel** : message `wa.me` prérempli envoyé par l'opérateur ; réponse gérée dans un back-office. Aucune API Meta. |
| Prix | **Catalogue fixe** : prix/personne défini à l'avance. Total = prix × nb personnes. |
| Commission | `% du total`, **affichée au fournisseur** dans le WhatsApp. Client paie le fournisseur sur place. Commission **réconciliée mensuellement** (réutilise `vps/partner_report.py`). Pas de paiement en ligne. |
| Granularité | **Une excursion par commande** en V1. Panier multi-activités → V2. |

## 4. Flux global

```
Client (sur crete.direct)
  └─ annuaire /excursions → choisit une excursion curée
  └─ formulaire : date souhaitée, nb personnes, nom, email, WhatsApp, note
  └─ total = prix/pers × nb pers (affiché en direct)
  └─ submit → POST /api/tours/order
        ├─ validation (tour-order.ts, pur)
        ├─ dédup (même email + excursion + date, fenêtre 10 min)
        ├─ insert tour_orders (status='new', total + commission calculés)
        ├─ notif Telegram opérateur
        └─ écran client : « Demande envoyée — on confirme la dispo, réponse par email sous ~24 h »

Opérateur (back-office admin)
  └─ liste des commandes par état
  └─ bouton « WhatsApp fournisseur » → wa.me prérempli :
       « {pax} pers · {excursion} · {date} · total {total}€ · ta part {net}€ · commission crete.direct {commission}€ · Tu valides ? »
  └─ fournisseur répond sur WhatsApp normal
  └─ opérateur clique : [Confirmer] [Refuser] [Contre-proposer (champ libre)]
        └─ transition d'état + email client correspondant (Resend)
```

## 5. Machine à états (`tour_orders.status`)

```
new ─ opérateur envoie le WhatsApp ─▶ sent_to_supplier
sent_to_supplier ─▶ confirmed      (→ email confirmation client)
sent_to_supplier ─▶ declined       (→ email d'excuse + suggestion)
sent_to_supplier ─▶ counter_proposed (→ email proposition au client : autre date/activité)
counter_proposed ─▶ confirmed | declined   (selon réponse client, gérée par l'opérateur)
```

Transitions effectuées **uniquement par l'opérateur** via le back-office (semi-manuel). Chaque transition horodatée.

## 6. Modèle de données

### Catalogue — `src/lib/tour-catalog.ts` (const TS, pur, zéro I/O)
Calqué sur `car-partners.ts` : source unique importable client/serveur/node ; projection JSON versionnée si le VPS doit la lire (`partner_report.py`).

```ts
interface Excursion {
  slug: string;            // ex "boat-chrissi-ierapetra"
  title: { en: string; fr: string };
  zoneId: string;          // réutilise les zones existantes (est/centre/ouest)
  pricePerPerson: number;  // EUR
  maxPax?: number;
  supplier: {
    name: string; email: string; whatsapp: string;
    commissionPct: number;          // ex 0.15
    leadRouting?: "relay" | "direct";
    since: string;
  };
  image?: string;
  active: boolean;
}
```
Helpers purs : `getExcursion(slug)`, `listExcursions({ zoneId? })`, `computeOrder({ excursion, pax })` → `{ total, commissionAmount, supplierNet }`.

### Table `tour_orders` (Supabase, DB `cretepulse`)
Calquée sur `car_requests` (accès `service_role` only — RGPD). Migration `supabase/migrations/<date>_tour_orders.sql`.

Champs : `id`, `created_at`, `locale`, `excursion_slug`, `excursion_title` (dénormalisé), `zone_id`, `supplier_name`, `supplier_email`, `supplier_whatsapp` (dénormalisés pour audit), `date_requested`, `pax`, `unit_price`, `total`, `commission_pct`, `commission_amount`, `customer_name`, `customer_email`, `customer_phone`, `note`, `status` (défaut `new`), `counter_note`, `source`, `updated_at`.

Index : `created_at DESC` (reporting), `(customer_email, excursion_slug, date_requested)` (dédup).

## 7. Composants (unités isolées, à responsabilité unique)

| Unité | Rôle | Dépendances |
|---|---|---|
| `src/lib/tour-catalog.ts` | Données curées + lookup + calcul total/commission (pur, testable) | aucune |
| `src/lib/tour-order.ts` | Validation payload + dédup helper (pur, node-safe) | tour-catalog |
| `src/app/api/tours/order/route.ts` | Capture : valide, insert, notif Telegram | tour-order, supabase-admin, notify |
| `src/app/api/admin/tours/[id]/route.ts` | Transitions d'état (opérateur), déclenche emails | supabase-admin, email |
| `src/app/[locale]/excursions/page.tsx` | Annuaire (cartes excursions, charte crete.direct) | tour-catalog |
| `src/components/tours/TourOrderForm.tsx` | Formulaire client (wizard léger) + calcul live + honeypot | — |
| `src/app/admin/tours/page.tsx` (ou route protégée) | Back-office : liste + bouton wa.me + boutons d'état | admin secret |
| `src/lib/email.ts` (extension) | Emails client : confirmation / refus / contre-proposition (Resend) | RESEND_API_KEY |
| notif Telegram | Alerte opérateur à chaque nouvelle commande | bot existant |

## 8. Sécurité & RGPD

- Table `tour_orders` : `REVOKE ALL FROM anon, authenticated`, accès `service_role` only (les coordonnées client ne sont jamais exposées côté public).
- Honeypot champ caché `website` sur le formulaire (faux succès si rempli).
- Back-office protégé par secret (réutilise `BOOKING_ADMIN_SECRET` ou équivalent).
- Dédup 10 min pour éviter les doublons de soumission.

## 9. Tests

- `tour-catalog.test.ts` : lookup, `computeOrder` (total, commission, arrondis).
- `tour-order.test.ts` : validation (date ≥ aujourd'hui, pax ≥ 1, email valide), rejet payloads invalides.
- Transitions d'état : table de vérité `status` → actions autorisées + email déclenché.

## 10. Hors V1 (YAGNI — V2+)

- **Panier multi-activités** (plusieurs excursions dans une commande, total agrégé).
- **Paiement en ligne** (acompte Stripe Connect, commission prélevée à la source).
- **WhatsApp Business API** (messages interactifs à boutons + webhook → machine à états auto). La couche « messaging » V1 est conçue comme module remplaçable pour préparer ce swap.
- **Self-service prestataire** (inscription via `/affiliate`).
- Extension aux autres catégories (hôtels, beach clubs, restos).

## 11. Réutilisation de l'existant

- Pattern data `car-partners.ts` → `tour-catalog.ts`.
- Pattern validation `car-lead.ts` → `tour-order.ts`.
- Pattern table `car_requests` → `tour_orders`.
- Routing `relay`/`direct` + réconciliation mensuelle `vps/partner_report.py` étendus aux excursions.
- Charte visuelle crete.direct (card-base, hero, palette lagoon/terra/sun) pour l'annuaire et le formulaire.
