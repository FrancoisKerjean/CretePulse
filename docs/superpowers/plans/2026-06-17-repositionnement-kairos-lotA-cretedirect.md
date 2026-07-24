# Repositionnement Kairos — Lot A (crete.direct) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer la pub gestion locative de crete.direct, délier la page /property-management, et ajouter un `InvestmentCTA` dofollow ciblé sur les pages data investisseur (/airbnb, /airport) → kairosguest.com/acheter-en-crete.

**Architecture:** `RentalCTA` (voyageur) et le booking restent intacts. On retire `AffiliateCTA type="propertyManagement"` + sa clé `affiliates.ts` + le lien footer. La page `/property-management` est gardée mais déliée (noindex + hors sitemap). Nouveau composant `InvestmentCTA` calqué sur `RentalCTA`, posé uniquement où l'intention investisseur existe. Repo `C:\Users\fkerj\cretepulse-build`, Next.js + next-intl (22 langues), workflow worktree/master→main.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind, next-intl. À faire APRÈS le Lot B (le wording des piliers vient de kairosguest).

**Spec:** `~/docs/specs/2026-06-17-repositionnement-kairos-bureau-etude-investissement-design.md`

---

### Task 0: Worktree + setup

- [ ] **Step 1** — `cd /c/Users/fkerj/cretepulse-build && git fetch origin && git worktree add -b feat/kairos-cta-investissement ../cretepulse-invest origin/master`
- [ ] **Step 2** — `cd /c/Users/fkerj/cretepulse-invest && npm install`
- [ ] **Step 3** — Baseline `npx tsc --noEmit` → 0.

### Task 1: Nouveau composant InvestmentCTA (dofollow)

**Files:** Create `src/components/InvestmentCTA.tsx`

- [ ] **Step 1** — Créer le composant (calqué sur `RentalCTA.tsx`, mais cible investissement, dofollow) :

```tsx
/**
 * Cross-link CTA from crete.direct investor-intent pages to kairosguest.com
 * (bureau d'étude et investissement). Placed ONLY where investment intent
 * exists: /airbnb (price/yield/occupancy data) and /airport (traffic data).
 * Dofollow (rel="noopener" only) — both sites are owned by Kairos.
 * UTM-tracked. kairosguest only has fr/en → others route to /en.
 */
const TITLES: Record<string, string> = {
  en: "Investing in short-term rentals in Crete?",
  fr: "Investir dans la location courte durée en Crète ?",
  de: "In Kurzzeitvermietung auf Kreta investieren?",
  el: "Επένδυση σε βραχυχρόνια μίσθωση στην Κρήτη;",
};
const BODIES: Record<string, string> = {
  en: "Kairos, investment study & advisory: yield analysis by area, buy-side support, France-Greece taxation. In French, AMF certified.",
  fr: "Kairos, bureau d'étude et investissement : analyse de rentabilité par zone, accompagnement à l'achat, fiscalité franco-grecque. En français, certifié AMF.",
  de: "Kairos, Studien- und Investmentbüro: Renditeanalyse nach Gebiet, Kaufbegleitung, Steuern Frankreich-Griechenland. Auf Französisch, AMF-zertifiziert.",
  el: "Kairos, γραφείο μελετών & επενδύσεων: ανάλυση απόδοσης ανά περιοχή, υποστήριξη αγοράς, γαλλο-ελληνική φορολογία. Στα γαλλικά, πιστοποίηση AMF.",
};
const CTAS: Record<string, string> = {
  en: "Study my project",
  fr: "Étudier mon projet",
  de: "Mein Projekt prüfen",
  el: "Μελέτη του έργου μου",
};

function targetLocale(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}

interface InvestmentCTAProps {
  locale: string;
  contentSlug?: string;
  contentType?: string;
}

export default function InvestmentCTA({ locale, contentSlug, contentType = "page" }: InvestmentCTAProps) {
  const t = (m: Record<string, string>) => m[locale] || m.en;
  const target = targetLocale(locale);
  const utm = new URLSearchParams({
    utm_source: "crete-direct",
    utm_medium: "cta",
    utm_campaign: "investment",
    utm_content: contentType + (contentSlug ? `:${contentSlug}` : ""),
  }).toString();
  const href = `https://kairosguest.com/${target}/acheter-en-crete?${utm}`;

  return (
    <aside className="mt-14 rounded-2xl border border-aegean/20 bg-aegean-faint px-6 py-8" data-cta="investment-cross-link">
      <div className="w-8 h-1 bg-terra rounded-full mb-4" />
      <h3 className="font-heading text-lg font-bold text-aegean mb-2">{t(TITLES)}</h3>
      <p className="text-sm text-text-muted mb-5 max-w-2xl leading-relaxed">{t(BODIES)}</p>
      <a href={href} target="_blank" rel="noopener"
         className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-aegean text-white rounded-lg hover:bg-aegean-light transition-colors">
        {t(CTAS)}
      </a>
    </aside>
  );
}
```

- [ ] **Step 2** — `npx tsc --noEmit` → 0. Commit:
  `git add src/components/InvestmentCTA.tsx && git commit -m "feat(invest): InvestmentCTA dofollow vers kairosguest /acheter-en-crete"`

### Task 2: Placer InvestmentCTA sur les pages data investisseur

**Files:** Modify `src/app/[locale]/airbnb/page.tsx` (index), `src/app/[locale]/airbnb/[neighbourhood]/page.tsx`, `src/app/[locale]/airport/page.tsx` (index), `src/app/[locale]/airport/[slug]/page.tsx`

- [ ] **Step 1** — Pour chaque page : importer `InvestmentCTA` et l'insérer en bas du contenu principal (avant le footer/maillage), comme `RentalCTA` ailleurs. Passer `locale`, `contentType` (`"airbnb"`/`"airbnb-zone"`/`"airport"`/`"airport-page"`) et `contentSlug` (le slug zone/iata quand dispo).
  Ex (airbnb/[neighbourhood]) : `<InvestmentCTA locale={locale} contentType="airbnb-zone" contentSlug={neighbourhood} />`
- [ ] **Step 2** — Vérifier qu'aucune de ces pages ne portait déjà un CTA Kairos concurrent (elles ne devraient pas).
- [ ] **Step 3** — `npx tsc --noEmit` → 0. Commit:
  `git add "src/app/[locale]/airbnb/page.tsx" "src/app/[locale]/airbnb/[neighbourhood]/page.tsx" "src/app/[locale]/airport/page.tsx" "src/app/[locale]/airport/[slug]/page.tsx" && git commit -m "feat(invest): InvestmentCTA sur /airbnb + /airport (audience investisseur)"`

### Task 3: Retirer le CTA gestion locative (propertyManagement)

**Files:** Modify `src/app/[locale]/beaches/[slug]/page.tsx` (l.560 `AffiliateCTA propertyManagement`), `src/app/[locale]/where-to-stay/[area]/page.tsx` (l.509), `src/app/[locale]/villages/[slug]/page.tsx` (l.217) ; `src/lib/affiliates.ts` (clé `propertyManagement`) ; `src/components/layout/Footer.tsx`

- [ ] **Step 1** — Retirer les 3 usages `<AffiliateCTA type="propertyManagement" .../>` (beaches/[slug], where-to-stay/[area], villages/[slug]) + l'import devenu inutile si `AffiliateCTA` n'est plus utilisé dans le fichier (vérifier : `AffiliateBanner` reste sur certains).
- [ ] **Step 2** — `src/lib/affiliates.ts` : retirer la clé `propertyManagement` du `AFFILIATE_LINKS`. Vérifier qu'aucun consommateur ne reste : `grep -rn "propertyManagement" src` — Expected: 0.
- [ ] **Step 3** — `src/components/layout/Footer.tsx` : retirer le lien property management s'il y figure. `grep -ni "property-management\|propertyManagement\|gestion" src/components/layout/Footer.tsx`.
- [ ] **Step 4** — i18n : `grep -rln "property management\|propertyManagement" src/messages` puis retirer/neutraliser les clés liées au label CTA (garder ce qui sert la page /property-management elle-même, qui reste).
- [ ] **Step 5** — `npx tsc --noEmit` → 0. Commit:
  `git add -p && git commit -m "feat(repositionnement): retire le CTA gestion locative (propertyManagement)"`

### Task 4: Délier /property-management (noindex + hors sitemap)

**Files:** Modify `src/app/[locale]/property-management/page.tsx` (metadata robots), `src/app/sitemap.xml/route.ts`

- [ ] **Step 1** — Dans `property-management/page.tsx`, ajouter à `generateMetadata` (ou export metadata) `robots: { index: false, follow: true }`.
- [ ] **Step 2** — Dans `sitemap.xml/route.ts`, retirer l'entrée `/property-management` (grep pour la localiser).
  Run après: `grep -n "property-management" src/app/sitemap.xml/route.ts` — Expected: 0.
- [ ] **Step 3** — `npx tsc --noEmit` → 0. Commit:
  `git add "src/app/[locale]/property-management/page.tsx" src/app/sitemap.xml/route.ts && git commit -m "feat(repositionnement): /property-management noindex + hors sitemap (page deliee, conservee)"`

### Task 5: Build, preview, vérif, merge prod

- [ ] **Step 1** — `SUPABASE_SERVICE_KEY=dummy npm run build` → EXIT 0 (le build SSG des 24k pages doit passer ; surveiller un éventuel ERROR prerender).
- [ ] **Step 2** — `git push -u origin feat/kairos-cta-investissement` (preview Vercel projet cretepulse-build).
- [ ] **Step 3** — Récupérer l'URL preview (API Vercel, token `siteweb/.env.local`) et **ouvrir** ([[feedback-open-preview-urls]]) : `/fr/airbnb/chania` + `/en/airbnb` + `/fr/airport/heraklion` (InvestmentCTA présent) ; `/fr/beaches/<slug>` + `/fr/where-to-stay/elounda` (plus de CTA gestion locative, RentalCTA voyageur toujours là) ; `/en/property-management` (noindex via view-source).
- [ ] **Step 4** — Validation Kami. Sur GO: merge prod FF + anti-contention (annuler builds redondants même commit si QUEUED) :
  ```bash
  git push origin feat/kairos-cta-investissement:master
  git push origin feat/kairos-cta-investissement:main
  ```
- [ ] **Step 5** — Vérif prod (curl UA navigateur) : `InvestmentCTA` (grep `acheter-en-crete`) sur /airbnb + /airport ; `propertyManagement`/`kairosguest.com` absent des beaches/where-to-stay/villages ; `RentalCTA` (`voyager-en-crete`) intact ; `/property-management` en `noindex`.
- [ ] **Step 6** — Cleanup worktree (désenregistrer + branches) + MAJ mémoire (session_log DEPLOY + fiche project_crete_direct + consulting_fiscal).

---

## Self-review (couverture spec Lot A)
- A1 retrait gestion locative ✓ Task 3 (CTA + affiliates.ts + footer + i18n) · A1 page déliée ✓ Task 4 · A2 InvestmentCTA ✓ Task 1+2 (dofollow ✓, ciblé /airbnb+/airport ✓) · A3 RentalCTA voyageur + booking intacts ✓ (non touchés, vérifiés Task 5) · B6 dofollow sens inverse ✓ (InvestmentCTA rel="noopener").
- Dépendance : exécuter APRÈS Lot B (wording piliers + page /acheter-en-crete cible déjà en place — elle existe déjà côté kairosguest, donc le lien est valide même avant merge Lot B).
