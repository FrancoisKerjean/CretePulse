# ServiceAlertBar — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la grosse boîte d'alerte service KTEL (≈140px, toujours dépliée sur `/buses` et chaque `/buses/[pair]`) par une barre fine repliable unique (`ServiceAlertBar`, ≈40px repliée, déplie au clic).

**Architecture:** Un composant client unique `ServiceAlertBar` (variant `global`|`route`) remplace les deux composants dupliqués actuels (`BusAlertsBanner` interne à `BusesClient.tsx` + `RouteAlertBanner.tsx`). La logique de résumé + l'i18n sont extraites dans un module pur `serviceAlert.ts` (sans JSX), testable via le pattern `node --experimental-strip-types` déjà utilisé dans le repo. Le détail des alertes reste toujours dans le DOM SSR (masqué CSS quand replié) → zéro perte SEO.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, lucide-react. Tests : `node:test`-style check script (zéro nouvelle dépendance). Gate : `tsc` + `next build` + Vercel preview.

**Spec de référence :** `docs/superpowers/specs/2026-06-15-service-alert-bar-design.md`

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/components/serviceAlert.ts` *(nouveau)* | Logique pure : table i18n (4 langues + fallback EN), `alertSummary()` (texte replié), `alertSource()` (ligne source par variant). Aucun JSX. Import `type`-only de `BusAlert` (effacé au runtime). |
| `scripts/check-service-alert.mjs` *(nouveau)* | Check TDD de `serviceAlert.ts` via `node --experimental-strip-types`. |
| `src/components/ServiceAlertBar.tsx` *(nouveau)* | Composant client : barre repliée (button a11y) + détail SSR masqué CSS. |
| `src/app/[locale]/buses/BusesClient.tsx` *(modif)* | Retirer `BusAlertsBanner` + clés i18n mortes ; rendre `<ServiceAlertBar variant="global">`. |
| `src/app/[locale]/buses/[pair]/page.tsx` *(modif)* | Remplacer `RouteAlertBanner` par `<ServiceAlertBar variant="route">`. |
| `src/components/RouteAlertBanner.tsx` *(suppression)* | Remplacé par `ServiceAlertBar`. |

---

## Task 1 : Worktree isolé

**Files:**
- Create (worktree) : `C:/Users/fkerj/cretepulse-service-alert` sur branche `feat/service-alert-bar`

- [ ] **Step 1 : Créer le worktree depuis `origin/master`**

```bash
git -C C:/Users/fkerj/cretepulse-build fetch origin --quiet
git -C C:/Users/fkerj/cretepulse-build worktree add -b feat/service-alert-bar C:/Users/fkerj/cretepulse-service-alert origin/master
```

- [ ] **Step 2 : Jonction `node_modules` + copie de l'env (build/start)**

```bash
cmd //c "mklink /J C:\\Users\\fkerj\\cretepulse-service-alert\\node_modules C:\\Users\\fkerj\\cretepulse-build\\node_modules"
cp C:/Users/fkerj/cretepulse-build/.env.local C:/Users/fkerj/cretepulse-service-alert/.env.local
```
(Conforme à `docs/WORKFLOW-MULTI-TERMINAL.md` : `.next`/port isolés par worktree, `node_modules` partagé par jonction.)

- [ ] **Step 3 : Rapatrier le spec + ce plan dans le worktree et committer**

```bash
cp C:/Users/fkerj/cretepulse-build/docs/superpowers/specs/2026-06-15-service-alert-bar-design.md C:/Users/fkerj/cretepulse-service-alert/docs/superpowers/specs/
cp C:/Users/fkerj/cretepulse-build/docs/superpowers/plans/2026-06-15-service-alert-bar.md C:/Users/fkerj/cretepulse-service-alert/docs/superpowers/plans/
git -C C:/Users/fkerj/cretepulse-service-alert add docs/superpowers/specs/2026-06-15-service-alert-bar-design.md docs/superpowers/plans/2026-06-15-service-alert-bar.md
git -C C:/Users/fkerj/cretepulse-service-alert commit -m "docs: spec + plan ServiceAlertBar"
```

> Toutes les commandes des tasks suivantes s'exécutent **dans le worktree** `C:/Users/fkerj/cretepulse-service-alert`.

---

## Task 2 : Logique pure + check (TDD)

**Files:**
- Test : `scripts/check-service-alert.mjs`
- Create : `src/components/serviceAlert.ts`

- [ ] **Step 1 : Écrire le check qui échoue**

`scripts/check-service-alert.mjs` :

```js
// node --experimental-strip-types scripts/check-service-alert.mjs
import { alertSummary, alertSource } from "../src/components/serviceAlert.ts";

let fail = 0;
const ok = (n, c) => { console.log(c ? `ok - ${n}` : `FAIL - ${n}`); if (!c) fail++; };

const mk = (over = {}) => ({
  id: 1, slug: "a", title: "Road closure Neapoli", category: null,
  published_date: "2026-06-15", url: "https://x", matched_routes: null, ...over,
});

// 0 alerte -> chaîne vide
ok("empty -> ''", alertSummary([], "fr") === "");
// 1 alerte AVEC matched_routes -> label · routes jointes
ok("1 with routes (fr)",
  alertSummary([mk({ matched_routes: ["Neapoli", "Ag. Nikolaos"] })], "fr")
  === "Alerte service · Neapoli · Ag. Nikolaos");
// 1 alerte SANS matched_routes -> label · title
ok("1 no routes (fr)",
  alertSummary([mk({ matched_routes: null, title: "Fermeture route" })], "fr")
  === "Alerte service · Fermeture route");
// matched_routes vide -> traité comme absent -> title
ok("1 empty routes -> title",
  alertSummary([mk({ matched_routes: [], title: "T" })], "fr")
  === "Alerte service · T");
// N alertes -> "N alertes service · voir"
ok("2 alerts (fr)",
  alertSummary([mk(), mk({ slug: "b" })], "fr") === "2 alertes service · voir");
// fallback locale inconnue -> EN
ok("unknown locale -> en", alertSummary([mk({ matched_routes: ["X"] })], "zz")
  === "Service alert · X");
ok("en 2 alerts", alertSummary([mk(), mk({ slug: "b" })], "en")
  === "2 service alerts · view");
// source line dépend du variant + fallback
ok("source route fr", alertSource("route", "fr").startsWith("Cliquez pour lire"));
ok("source global fr", alertSource("global", "fr").startsWith("Annonces KTEL"));
ok("source fallback en", alertSource("route", "zz").startsWith("Click to read"));

console.log(fail === 0 ? "ALL OK" : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2 : Lancer le check, vérifier l'échec**

Run : `node --experimental-strip-types scripts/check-service-alert.mjs`
Expected : FAIL (erreur de résolution de module `../src/components/serviceAlert.ts` : fichier inexistant).

- [ ] **Step 3 : Implémenter `src/components/serviceAlert.ts`**

```ts
import type { BusAlert } from "@/lib/bus-alerts";

type Dict = Record<string, string>;

export const ALERT_I18N = {
  labelAlerte: { en: "Service alert", fr: "Alerte service", de: "Betriebsmeldung", el: "Ειδοποίηση" },
  labelAlertes: { en: "service alerts", fr: "alertes service", de: "Betriebsmeldungen", el: "ειδοποιήσεις" },
  voir: { en: "view", fr: "voir", de: "ansehen", el: "προβολή" },
  toggleAria: {
    en: "Toggle alert details", fr: "Afficher le détail de l'alerte",
    de: "Meldungsdetails ein-/ausblenden", el: "Εναλλαγή λεπτομερειών ειδοποίησης",
  },
  sourceRoute: {
    en: "Click to read the official notice before travelling.",
    fr: "Cliquez pour lire l'avis officiel avant de partir.",
    de: "Vor der Reise den offiziellen Hinweis lesen.",
    el: "Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
  sourceGlobal: {
    en: "From KTEL Heraklion-Lasithi announcements. Click to read the official notice before travelling.",
    fr: "Annonces KTEL Héraklion-Lassithi. Cliquez pour lire l'avis officiel avant de partir.",
    de: "Meldungen von KTEL Heraklion-Lasithi. Vor der Fahrt die offizielle Mitteilung lesen.",
    el: "Ανακοινώσεις ΚΤΕΛ Ηρακλείου-Λασιθίου. Διαβάστε την επίσημη ανακοίνωση πριν ταξιδέψετε.",
  },
} satisfies Record<string, Dict>;

export const trAlert = (m: Dict, locale: string): string => m[locale] ?? m.en;

/** Texte de la ligne repliée (en-tête). Vide si aucune alerte. */
export function alertSummary(alerts: BusAlert[], locale: string): string {
  if (alerts.length === 0) return "";
  if (alerts.length === 1) {
    const a = alerts[0];
    const ctx = a.matched_routes && a.matched_routes.length
      ? a.matched_routes.join(" · ")
      : a.title;
    return `${trAlert(ALERT_I18N.labelAlerte, locale)} · ${ctx}`;
  }
  return `${alerts.length} ${trAlert(ALERT_I18N.labelAlertes, locale)} · ${trAlert(ALERT_I18N.voir, locale)}`;
}

/** Ligne source (attribution KTEL) selon le variant. */
export const alertSource = (variant: "global" | "route", locale: string): string =>
  trAlert(variant === "route" ? ALERT_I18N.sourceRoute : ALERT_I18N.sourceGlobal, locale);
```

- [ ] **Step 4 : Relancer le check, vérifier le succès**

Run : `node --experimental-strip-types scripts/check-service-alert.mjs`
Expected : 10 lignes `ok - …` puis `ALL OK` (exit 0).

- [ ] **Step 5 : Commit**

```bash
git add scripts/check-service-alert.mjs src/components/serviceAlert.ts
git commit -m "feat: pure summary/i18n logic for ServiceAlertBar (+ TDD check)"
```

---

## Task 3 : Composant `ServiceAlertBar`

**Files:**
- Create : `src/components/ServiceAlertBar.tsx`

- [ ] **Step 1 : Écrire le composant**

```tsx
"use client";

import { useId, useState } from "react";
import { TriangleAlert, ChevronDown, ExternalLink } from "lucide-react";
import type { BusAlert } from "@/lib/bus-alerts";
import { ALERT_I18N, alertSource, alertSummary, trAlert } from "@/components/serviceAlert";

// Barre d'alerte service KTEL, repliée par défaut (≈40px). Le détail reste
// toujours rendu dans le DOM SSR (masqué en CSS quand replié, jamais via
// `{open && …}`) -> aucune perte de maillage SEO. Remplace BusAlertsBanner
// (variant "global", /buses) et RouteAlertBanner (variant "route", /buses/[pair]).
export function ServiceAlertBar({
  alerts,
  locale,
  variant,
}: {
  alerts: BusAlert[];
  locale: string;
  variant: "global" | "route";
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={trAlert(ALERT_I18N.toggleAria, locale)}
        className="flex w-full items-center gap-2 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-left hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <TriangleAlert className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-sm font-semibold text-amber-900 line-clamp-1">
          {alertSummary(alerts, locale)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-amber-700 ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={detailId}
        className={`overflow-hidden transition-all duration-200 motion-reduce:transition-none ${
          open ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3">
          <ul className="space-y-2 list-none p-0 m-0">
            {alerts.map((a) => (
              <li key={a.slug} className="text-sm leading-snug">
                <a
                  href={a.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-start gap-1 font-semibold text-amber-900 hover:underline"
                >
                  {a.published_date && (
                    <span className="font-data text-xs text-amber-700 mr-1.5">
                      {new Date(a.published_date).toLocaleDateString(locale)}
                    </span>
                  )}
                  {a.title}
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 mt-2.5 mb-0">{alertSource(variant, locale)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier le typage**

Run : `npx tsc --noEmit`
Expected : aucune erreur sur `ServiceAlertBar.tsx`/`serviceAlert.ts` (le repo peut avoir des erreurs préexistantes ailleurs — ne pas en introduire de nouvelles sur ces fichiers).

- [ ] **Step 3 : Commit**

```bash
git add src/components/ServiceAlertBar.tsx
git commit -m "feat: ServiceAlertBar collapsible component"
```

---

## Task 4 : Brancher sur `/buses` (variant global)

**Files:**
- Modify : `src/app/[locale]/buses/BusesClient.tsx`

- [ ] **Step 1 : Ajouter l'import du composant**

En tête de `BusesClient.tsx`, ajouter :

```tsx
import { ServiceAlertBar } from "@/components/ServiceAlertBar";
```

- [ ] **Step 2 : Supprimer la fonction `BusAlertsBanner`**

Retirer entièrement la fonction `function BusAlertsBanner({ alerts, locale }: …) { … }` (le commentaire d'en-tête « Bandeau d'alertes service (KTEL Est)… » + le corps, ≈ l.180-217).

- [ ] **Step 3 : Remplacer l'usage**

Remplacer la ligne `<BusAlertsBanner alerts={alerts} locale={locale} />` par :

```tsx
<ServiceAlertBar alerts={alerts} locale={locale} variant="global" />
```

- [ ] **Step 4 : Retirer les clés i18n et imports devenus inutiles**

- Supprimer les entrées `alertsTitle: { … }` et `alertsSource: { … }` du dictionnaire local (déplacées dans `serviceAlert.ts`).
- Vérifier l'usage de `TriangleAlert` : `grep -n "TriangleAlert" src/app/[locale]/buses/BusesClient.tsx`. S'il n'apparaît plus, le retirer de l'import `lucide-react` de la l.4 (garder `Info`, `ChevronDown` s'ils restent utilisés ailleurs dans le fichier — vérifier de même).

- [ ] **Step 5 : Typage + lint**

Run : `npx tsc --noEmit` puis `npx eslint src/app/[locale]/buses/BusesClient.tsx`
Expected : pas d'erreur, pas de warning « unused » (`TriangleAlert`, `alertsTitle`, `alertsSource`).

- [ ] **Step 6 : Commit**

```bash
git add src/app/[locale]/buses/BusesClient.tsx
git commit -m "feat: use ServiceAlertBar on /buses (variant global)"
```

---

## Task 5 : Brancher sur `/buses/[pair]` + supprimer l'ancien composant

**Files:**
- Modify : `src/app/[locale]/buses/[pair]/page.tsx`
- Delete : `src/components/RouteAlertBanner.tsx`

- [ ] **Step 1 : Remplacer l'import (l.11)**

```tsx
// avant : import { RouteAlertBanner } from "@/components/RouteAlertBanner";
import { ServiceAlertBar } from "@/components/ServiceAlertBar";
```

- [ ] **Step 2 : Remplacer l'usage (l.330)**

```tsx
// avant : <RouteAlertBanner alerts={routeAlerts} locale={ui} />
<ServiceAlertBar alerts={routeAlerts} locale={ui} variant="route" />
```

- [ ] **Step 3 : Supprimer l'ancien composant**

```bash
git rm src/components/RouteAlertBanner.tsx
```

- [ ] **Step 4 : Typage (pas d'import pendant)**

Run : `npx tsc --noEmit`
Expected : aucune référence résiduelle à `RouteAlertBanner` ; pas d'erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/app/[locale]/buses/[pair]/page.tsx
git commit -m "feat: use ServiceAlertBar on /buses/[pair] (variant route); remove RouteAlertBanner"
```

---

## Task 6 : Build, vérification SEO/SSR, preview, déploiement

**Files:** aucun (vérification + livraison)

- [ ] **Step 1 : Build de production**

Run : `npx next build`
Expected : exit 0 (build complet, pas d'erreur de type).

- [ ] **Step 2 : Vérifier le rendu SSR + le SEO en local**

```bash
npx next start -p 3987 &
# attendre le démarrage puis :
curl -s "http://localhost:3987/en/buses/agios-nikolaos-to-heraklion" > /tmp/route.html
```
Vérifications sur `/tmp/route.html` (barre repliée par défaut, mais détail présent dans le HTML) :
- `grep -c "max-h-0" /tmp/route.html` ≥ 1 (le détail est rendu, replié en CSS).
- `grep -o "aria-expanded=\"false\"" /tmp/route.html` présent (replié par défaut).
- Le **titre de l'alerte** (ex. « Neapoli ») et le lien `href` vers l'avis officiel sont présents dans le HTML **même replié** (SEO préservé).
Expected : les 3 vérifs OK. (L'alerte id 31 — fermeture Neapoli–Agios Nikolaos — est active dans la fenêtre de 45 j, donc `routeAlerts` est non vide sur ce trajet.) Arrêter ensuite `next start`.

- [ ] **Step 3 : Push de la branche → preview Vercel + validation visuelle Kami**

```bash
git push origin feat/service-alert-bar
```
Sur l'URL de preview Vercel : vérifier sur `/buses` ET `/buses/agios-nikolaos-to-heraklion` que la barre est **repliée** (~40px) par défaut, qu'un **clic la déplie** (détail + lien avis officiel) et qu'un re-clic la replie ; chevron qui pivote ; navigation clavier (focus + Entrée). **Faire valider visuellement par Kami.**

- [ ] **Step 4 : Déploiement prod (après ✅ visuel de Kami)**

```bash
git -C C:/Users/fkerj/cretepulse-service-alert fetch origin --quiet
git -C C:/Users/fkerj/cretepulse-service-alert checkout master
git -C C:/Users/fkerj/cretepulse-service-alert merge --ff-only origin/master   # se caler sur master récent
git -C C:/Users/fkerj/cretepulse-service-alert merge feat/service-alert-bar
git -C C:/Users/fkerj/cretepulse-service-alert push origin master:master
git -C C:/Users/fkerj/cretepulse-service-alert push origin master:main          # déploiement prod (acte conscient)
```
(Si `merge --ff-only` échoue parce que `feat/service-alert-bar` a divergé de `master`, rebaser la branche sur `origin/master` d'abord — cf `feedback_fetch_before_push_main`. Auteur git = `kerjeanfrancois29`.)
Expected : build Vercel prod « Ready » ; barre repliable live sur `/buses` et les pages de trajet.

- [ ] **Step 5 : Nettoyage worktree (après prod Ready)**

```bash
git -C C:/Users/fkerj/cretepulse-build worktree remove C:/Users/fkerj/cretepulse-service-alert
git -C C:/Users/fkerj/cretepulse-build branch -d feat/service-alert-bar
git -C C:/Users/fkerj/cretepulse-build push origin --delete feat/service-alert-bar
```

---

## Notes de vérification (self-review du plan)

- **Couverture spec** : composant unifié (T3) ; replié par défaut + résumé 1/N + matched_routes (T2 logique + T3 UI) ; SSR/SEO détail toujours dans le DOM (T3 + vérif T6.2) ; a11y button/aria-expanded/aria-controls/focus (T3) ; ambre mince + chevron + animation reduce-motion (T3) ; i18n 4 langues + fallback (T2) ; variant = ligne source (T2 `alertSource`) ; suppression duplication + RouteAlertBanner (T4/T5) ; gate tsc+build + Playwright/preview + curl SEO (T6) ; conventions worktree/branche/master:main (T1/T6).
- **Pas de placeholder** : tout le code des composants et du check est fourni intégralement.
- **Cohérence des types** : `BusAlert` (id, slug, title, category, published_date, url, matched_routes) utilisé tel quel ; `alertSummary(alerts, locale)` et `alertSource(variant, locale)` ont la même signature partout (check + composant) ; `ServiceAlertBar` props `{ alerts, locale, variant }` identiques aux deux call sites (T4 `variant="global"`, T5 `variant="route"`).
