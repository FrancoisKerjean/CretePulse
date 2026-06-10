# Runbook — signature d'un partenaire taxi

Déclencheur : paiement Stripe reçu (email Stripe, compte Novai, produit
`prod_UgESspkuSkuOzo`, Payment Link `https://buy.stripe.com/14A9ATgk6gBtdOB1Ex0VO00`)
OU accord par email.

1. Vérifier le paiement dans Stripe (subscription active, 49 €/mois).
2. Confirmer la zone par email avec le partenaire (le Payment Link ne capture pas
   la zone : demander nom exact, zone, téléphone à afficher, site web éventuel,
   email destinataire du rapport mensuel).
   Si la zone est déjà prise : rembourser via Stripe et proposer une zone voisine.
3. Ajouter l'entrée dans `src/data/taxi-partners.json` → `partners` :
   `{ "zoneId": "...", "name": "...", "phone": "+30 ...", "website": "https://...",
      "reportEmail": "...", "since": "AAAA-MM-JJ" }`
   (ids de zones : heraklion, lasithi-north, ierapetra-southeast, sitia, chania,
   chania-south, rethymno)
4. PREMIER PARTENAIRE UNIQUEMENT — bascule honnête des textes "no ads" :
   - `src/messages/en.json` `footer.about` : remplacer "No ads (yet). No tracking."
     par "Clearly-labelled local sponsors. No tracking." (mêmes clés dans les
     21 autres fichiers messages/*.json si la chaîne y est traduite).
   - `src/app/llms.txt/route.ts` ligne "No tracking. No ads." → "No tracking.
     Clearly-labelled local sponsors."
   - `src/app/[locale]/about/page.tsx` description "No ads, no tracking, no
     affiliation." → "Clearly-labelled local sponsors, no tracking."
5. `node scripts/check-taxi-partners.mjs` puis commit + push master ET main.
6. Copier le JSON sur le VPS (rapport mensuel) :
   `scp src/data/taxi-partners.json root@89.167.115.63:/opt/cretepulse/taxi-partners.json`
7. Vérifier en prod (page paire de la zone : badge "Sponsored" + bouton tel:).
8. Répondre au partenaire : slot live + date du premier rapport (le 1er du mois,
   08:00 Athens, cron VPS `partner_report.py`).
9. Mémoire : ligne session_log LEAD + MAJ `commerce_state.md`.
