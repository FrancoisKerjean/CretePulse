# Board « Prochains bus » rangées cliquables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre chaque rangée du board « Prochains bus » de l'accueil cliquable vers sa page de ligne `/buses/[pair]`, avec affordance visuelle et accessibilité.

**Architecture:** Un seul composant client touché (`DepBoard.tsx`). Chaque rangée passe de `<div>` à `<Link>` vers `/buses/${pairSlug(from, to)}` (le `Link` de `@/i18n/navigation` préfixe la locale). Fallback `<div>` non cliquable si slug null (jamais en pratique). Un check-script garde l'invariant « toute paire du board a un slug valide ». Event Plausible `board_route_click` au clic pour la mesure.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, next-intl, lucide-react, Plausible (self-hosted). Pas de framework de test JS dans le repo → garde via check-script `node --experimental-strip-types` (pattern `scripts/check-bus-pairs.mjs`) + gate `tsc` + `next build` + preview Vercel.

**Spec:** `docs/superpowers/specs/2026-06-15-home-depboard-clickable-rows-design.md`

---

## File Structure

| Fichier | Rôle | Action |
|---------|------|--------|
| `src/components/DepBoard.tsx` | Board des prochains départs (client). Rend chaque rangée comme lien. | Modifier |
| `scripts/check-bus-pairs.mjs` | Assertions pures du module bus-pairs. | Modifier (ajout garde board) |

Aucune donnée, aucune route, aucun autre composant. La cible `/buses/[pair]` existe déjà (`src/app/[locale]/buses/[pair]/page.tsx`).

---

## Task 1: Worktree isolé

**Files:** aucun fichier source (setup git).

- [ ] **Step 1: Créer le worktree depuis `origin/master`**

Depuis `C:\Users\fkerj\cretepulse-build` :

```bash
git fetch origin
git worktree add -b feat/home-depboard-clickable ../cretepulse-depboard origin/master
```

Expected: `Preparing worktree (new branch 'feat/home-depboard-clickable')` + `HEAD is now at <sha>`.

- [ ] **Step 2: Jonction `node_modules` (évite un `npm install` complet)**

```bash
cmd /c mklink /J C:\Users\fkerj\cretepulse-depboard\node_modules C:\Users\fkerj\cretepulse-build\node_modules
```

Expected: `Junction created for ...\node_modules <<===>> ...\cretepulse-build\node_modules`.

- [ ] **Step 3: Copier les env locaux (pour un éventuel `next build` local)**

```bash
cp C:\Users\fkerj\cretepulse-build\.env.local C:\Users\fkerj\cretepulse-depboard\.env.local
```

Expected: pas d'erreur (si `.env.local` absent, ignorer — le build réel se fait sur Vercel preview).

- [ ] **Step 4: Copier spec + plan dans le worktree**

```bash
cp C:\Users\fkerj\cretepulse-build\docs\superpowers\specs\2026-06-15-home-depboard-clickable-rows-design.md C:\Users\fkerj\cretepulse-depboard\docs\superpowers\specs\
cp C:\Users\fkerj\cretepulse-build\docs\superpowers\plans\2026-06-15-home-depboard-clickable-rows.md C:\Users\fkerj\cretepulse-depboard\docs\superpowers\plans\
```

Expected: les 2 fichiers présents dans le worktree.

**Toutes les tâches suivantes s'exécutent dans `C:\Users\fkerj\cretepulse-depboard`.**

---

## Task 2: Garde d'invariant — chaque paire du board a un slug valide

Le rendu cliquable repose sur l'invariant : toute paire affichée par le board produit un `pairSlug` non-null. Cette garde le verrouille (si quelqu'un édite `BUS_PLACE_SLUGS` ou la liste du board et casse l'invariant, les rangées redeviendraient silencieusement non cliquables → le check échoue).

**Files:**
- Modify: `scripts/check-bus-pairs.mjs`

- [ ] **Step 1: Ajouter les assertions de garde**

Insérer ce bloc dans `scripts/check-bus-pairs.mjs`, juste avant la dernière ligne `console.log(...)` :

```js
// --- invariant board accueil (DepBoard) : chaque paire du board -> slug valide
// Doit rester aligne avec boardPairs dans src/app/[locale]/page.tsx.
const BOARD_PAIRS = [
  ["Heraklion", "Chania"],
  ["Heraklion", "Ierapetra"],
  ["Chania", "Paleochora"],
  ["Heraklion", "Agios Nikolaos"],
  ["Heraklion", "Siteia"],
  ["Ierapetra", "Makry Gyalos"],
];
for (const [a, b] of BOARD_PAIRS) {
  assert.ok(pairSlug(a, b), `board pair sans slug: ${a} -> ${b}`);
}
```

- [ ] **Step 2: Lancer le check, vérifier le vert**

```bash
node --experimental-strip-types scripts/check-bus-pairs.mjs
```

Expected: `OK check-bus-pairs: <n> paires sur fixtures` (exit 0, aucune assertion échouée).

- [ ] **Step 3: Vérifier que la garde mord (sanity, temporaire)**

Remplacer temporairement `["Heraklion", "Chania"]` par `["Heraklion", "Nowhere Town"]`, relancer le check.

Expected: échec `AssertionError ... board pair sans slug: Heraklion -> Nowhere Town`. Puis **rétablir** la liste exacte de l'étape 1.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-bus-pairs.mjs
git commit -m "$(cat <<'EOF'
test: garde l'invariant slug des paires du board accueil

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Rendre les rangées du board cliquables

**Files:**
- Modify: `src/components/DepBoard.tsx` (remplacement intégral)

- [ ] **Step 1: Remplacer le contenu de `src/components/DepBoard.tsx` par :**

```tsx
"use client";
// Board nuit des prochains departs : signature "donnees live" (style Flighty).
// Calcule les N prochains departs toutes lignes confondues via timesForDate.
// Chaque rangee est un lien vers la page de ligne /buses/[pair].
// Reference visuelle : docs/design/kalimera/home-v8.html bloc .dep-card
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { timesForDate } from "@/lib/bus-journey";
import { pairSlug } from "@/lib/bus-pairs";
import type { BusRoute } from "@/lib/buses";
import { CiBus } from "@/components/icons";

const T = {
  title: { en: "Next buses", fr: "Prochains bus", de: "Nächste Busse", el: "Επόμενα λεωφορεία" },
  plan: { en: "Plan a journey", fr: "Planifier un trajet", de: "Fahrt planen", el: "Σχεδιασμός" },
  inMin: { en: (m: number) => `in ${m} min`, fr: (m: number) => `dans ${m} min`, de: (m: number) => `in ${m} Min`, el: (m: number) => `σε ${m}’` },
  last: { en: "last today", fr: "dernier du jour", de: "letzter heute", el: "τελευταίο" },
  tomorrow: { en: "tomorrow", fr: "demain", de: "morgen", el: "αύριο" },
  routeAria: {
    en: (a: string, b: string) => `Timetable ${a} – ${b}`,
    fr: (a: string, b: string) => `Horaires ${a} – ${b}`,
    de: (a: string, b: string) => `Fahrplan ${a} – ${b}`,
    el: (a: string, b: string) => `Δρομολόγια ${a} – ${b}`,
  },
};

interface NextDep { from: string; to: string; time: string; inMin: number; isLast: boolean; isTomorrow: boolean; price: number | null; pair: string | null }

function athens(): { iso: string; minutes: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { iso: `${g("year")}-${g("month")}-${g("day")}`, minutes: (parseInt(g("hour")) % 24) * 60 + parseInt(g("minute")) };
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// Event Plausible "board_route_click" : mesure si la cliquabilite du board
// genere des sessions bus (meme pattern que bus_search / ticket_intent).
function trackRouteClick(pair: string) {
  const plausible = (window as unknown as {
    plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
  }).plausible;
  plausible?.("board_route_click", { props: { pair } });
}

export function DepBoard({ routes, locale, count = 3 }: { routes: BusRoute[]; locale: string; count?: number }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as keyof typeof T.title;
  const [deps, setDeps] = useState<NextDep[]>([]);

  useEffect(() => {
    const { iso, minutes } = athens();
    const tomorrowIso = new Date(new Date(`${iso}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10);
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const out: NextDep[] = [];
    for (const r of routes) {
      const times = timesForDate(r, iso).map(toMin).sort((a, b) => a - b);
      const idx = times.findIndex((m) => m >= minutes);
      if (idx === -1) {
        // plus rien aujourd'hui : le board vit quand meme, premier bus demain
        const first = timesForDate(r, tomorrowIso).map(toMin).sort((a, b) => a - b)[0];
        if (first === undefined) continue;
        out.push({
          from: r.from_place, to: r.to_place, time: fmt(first),
          inMin: 1440 - minutes + first, isLast: false, isTomorrow: true,
          price: r.price_eur ?? null,
          pair: pairSlug(r.from_place, r.to_place),
        });
        continue;
      }
      const m = times[idx];
      out.push({
        from: r.from_place, to: r.to_place,
        time: fmt(m),
        inMin: m - minutes, isLast: idx === times.length - 1, isTomorrow: false,
        price: r.price_eur ?? null,
        pair: pairSlug(r.from_place, r.to_place),
      });
    }
    out.sort((a, b) => a.inMin - b.inMin);
    // dedup par paire from->to (garder le plus proche)
    const seen = new Set<string>();
    setDeps(out.filter((d) => { const k = `${d.from}>${d.to}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, count));
  }, [routes, count]);

  if (deps.length === 0) return null;
  return (
    <div className="bg-night text-[#EAF7FA] rounded-[30px] px-7 py-6 pb-4 shadow-[0_24px_60px_rgba(7,55,74,.4)]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-heading font-bold text-lg inline-flex items-center gap-2.5">
          <span className="bg-lagoon text-night rounded-xl p-2 inline-flex"><CiBus className="w-[19px] h-[19px]" /></span>
          {T.title[ui]}
        </span>
        <Link href="/buses" className="bg-lagoon text-night rounded-full px-4 py-2 text-[13.5px] font-heading font-bold">
          {T.plan[ui]}
        </Link>
      </div>
      <div className="font-data">
        {deps.map((d) => {
          const rowClass = "grid grid-cols-[1fr_auto_auto_auto_auto] gap-5 items-center py-3 border-t border-[#EAF7FA]/12";
          const inner = (
            <>
              <span className="font-semibold">{d.from} <span className="text-lagoon mx-1">·</span> {d.to}</span>
              <span className="text-[25px] font-bold">{d.time}</span>
              <span className={`text-[13px] font-bold rounded-full px-3 py-1.5 ${d.isLast || d.isTomorrow ? "bg-sun/16 text-sun" : "bg-ok/18 text-[#43E89D]"}`}>
                {d.isTomorrow ? T.tomorrow[ui] : d.isLast ? T.last[ui] : T.inMin[ui](d.inMin)}
              </span>
              <span className="text-right text-[#EAF7FA]/55 text-sm w-16">{d.price != null ? `${d.price.toFixed(2)} €` : ""}</span>
              <ChevronRight className="w-4 h-4 text-[#EAF7FA]/40" aria-hidden />
            </>
          );
          return d.pair ? (
            <Link
              key={`${d.from}-${d.to}`}
              href={`/buses/${d.pair}`}
              aria-label={T.routeAria[ui](d.from, d.to)}
              onClick={() => trackRouteClick(d.pair!)}
              className={`${rowClass} -mx-2 px-2 rounded-lg transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon/60`}
            >
              {inner}
            </Link>
          ) : (
            <div key={`${d.from}-${d.to}`} className={rowClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Changements vs l'existant : imports `ChevronRight` + `pairSlug` ; entrée i18n `routeAria` ; champ `pair` dans `NextDep` (calculé aux 2 branches) ; helper `trackRouteClick` ; grille passée à 5 colonnes (chevron) ; chaque rangée rendue comme `<Link>` (ou `<div>` si `pair` null). Le calcul des départs, le tri, le dedup, les libellés temps/badge/prix sont **inchangés**.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: aucune erreur sur `DepBoard.tsx`. (Le repo peut avoir un baseline d'erreurs préexistantes ailleurs ; vérifier qu'aucune ne pointe vers `src/components/DepBoard.tsx`.)

- [ ] **Step 3: Lint**

```bash
npx eslint src/components/DepBoard.tsx
```

Expected: 0 erreur, 0 warning sur le fichier.

- [ ] **Step 4: Re-lancer la garde (toujours verte)**

```bash
node --experimental-strip-types scripts/check-bus-pairs.mjs
```

Expected: `OK check-bus-pairs: ...`.

- [ ] **Step 5: Commit**

```bash
git add src/components/DepBoard.tsx
git commit -m "$(cat <<'EOF'
feat(home): rangees du board "Prochains bus" cliquables vers /buses/[pair]

Chaque rangee devient un Link i18n vers la page de ligne (toute la rangee
cliquable, chevron persistant, hover + focus-visible, aria-label localise).
Fallback <div> si slug null (jamais en pratique, invariant garde par
check-bus-pairs). Event Plausible board_route_click pour mesurer la traction.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Build, preview Vercel, validation visuelle, merge

**Files:** aucun (vérification + intégration).

- [ ] **Step 1: Build local best-effort (si env présent)**

```bash
npm run build
```

Expected: build OK. Si échec dû à des variables d'env manquantes (Supabase), c'est tolérable en local — le build de référence se fait sur Vercel preview à l'étape suivante. Aucune erreur ne doit provenir de `DepBoard.tsx` lui-même (erreurs TS déjà exclues en Task 3).

- [ ] **Step 2: Pousser la branche pour la preview Vercel**

```bash
git push -u origin feat/home-depboard-clickable
```

Expected: branche poussée, Vercel génère une URL de preview (build automatique).

- [ ] **Step 3: Vérification visuelle sur la preview (checklist)**

Sur l'URL de preview, page d'accueil (tester `/fr` et `/en`) :
1. Survol d'une rangée du board → fond légèrement éclairci + curseur lien + chevron `›` visible à droite.
2. Clic « Heraklion · Chania » → atterrit sur `/<locale>/buses/chania-to-heraklion` (slug alphabétique), page horaires.
3. Clavier : `Tab` atteint chaque rangée, anneau de focus lagon visible, `Enter` navigue.
4. Mobile (devtools responsive) : tap sur toute la largeur de la rangée fonctionne ; chevron visible.
5. Le bouton « Planifier un trajet » mène toujours à `/buses` (inchangé).
6. Console réseau Plausible : un event `board_route_click` (prop `pair`) part au clic.

- [ ] **Step 4: Validation Kami (gate visuel)**

Présenter l'URL de preview à Kami. Attendre son OK avant le merge prod.

- [ ] **Step 5: Merge vers prod (`master` puis `main`)**

Après OK Kami, depuis le worktree :

```bash
git checkout master
git merge --no-ff feat/home-depboard-clickable -m "merge: home DepBoard clickable rows"
git push origin master
git push origin master:main
```

Expected: `main` mis à jour → Vercel déploie la prod. (Rappel CLAUDE.md : `main` = prod, on n'y arrive que par merge depuis `master`, acte conscient.)

- [ ] **Step 6: Cleanup worktree**

```bash
cd C:\Users\fkerj\cretepulse-build
git worktree remove ../cretepulse-depboard
git branch -d feat/home-depboard-clickable
```

Expected: worktree retiré, branche locale supprimée (la branche distante reste comme trace, ou la supprimer si Kami veut).

---

## Self-Review (effectué)

**1. Spec coverage**

| Exigence spec | Tâche |
|---------------|-------|
| Rangée → `<Link href=/buses/[pair]>` | Task 3 Step 1 |
| `Link` i18n (préfixe locale) | Task 3 Step 1 (import existant réutilisé) |
| Toute la rangée cliquable | Task 3 Step 1 (`<Link>` enveloppe `inner`) |
| Chevron persistant | Task 3 Step 1 (5e colonne `ChevronRight`) |
| Hover + focus-visible | Task 3 Step 1 (classes `hover:`/`focus-visible:`) |
| aria-label localisé | Task 3 Step 1 (`routeAria` 4 langues) |
| Champ `pair` dans `NextDep`, calculé aux 2 branches | Task 3 Step 1 |
| Fallback `<div>` si slug null | Task 3 Step 1 (ternaire `d.pair ?`) |
| Invariant slug garanti | Task 2 (garde check-script) |
| Event Plausible `board_route_click` | Task 3 Step 1 (`trackRouteClick`) |
| Inchangé : calcul/tri/dedup/bouton Planifier | Task 3 Step 1 (vérifié par diff) |
| Vérif tsc / build / preview | Task 3 Steps 2-3, Task 4 Steps 1-3 |

Aucune exigence sans tâche.

**2. Placeholder scan:** aucun TBD/TODO. Tout le code est complet (fichier intégral en Task 3, bloc d'assertions en Task 2).

**3. Type consistency:** `NextDep.pair: string | null` cohérent entre la construction (`pairSlug(...)`) et l'usage (`d.pair ?` / `href={/buses/${d.pair}}` / `d.pair!` dans `onClick`). `T.routeAria[ui]` aligné sur les clés de `T.title` (en/fr/de/el), même pattern que `T.inMin[ui]`. `trackRouteClick(pair: string)` reçoit `d.pair!` (non-null assuré dans la branche truthy).
