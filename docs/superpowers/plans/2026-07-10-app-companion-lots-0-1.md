# App compagnon crete.direct — Lots 0+1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumenter la rétention réelle (lot 0) et rendre le site installable avec offline bus + bannière d'installation contextuelle (lot 1), sans rien casser de l'infra push existante.

**Architecture:** Tout vit dans le codebase Next.js existant. Lot 0 = module pur `src/lib/retention.ts` (testé par script check maison) + beacon client monté dans le layout locale qui envoie des props agrégées à Plausible (AUCUN identifiant transmis, compteur localStorage local). Lot 1 = extension du `public/sw.js` existant (push-only) avec un cache network-first des pages /buses, enregistrement du SW au chargement, manifest enrichi, et `InstallBanner` client gaté (mobile, non-standalone, pages outils, délai).

**Tech Stack:** Next.js 16 App Router, next-intl (22 locales, parité stricte `check:i18n`), Plausible self-hosted (`window.plausible?.()`), service worker vanilla, scripts check `node --experimental-strip-types`.

**État existant (vérifié 10/07/2026, ne pas recréer) :**
- `src/app/manifest.ts` : manifest PWA basique (name, icons 192/512, standalone, #07374A).
- `public/sw.js` : service worker PUSH UNIQUEMENT (handlers `push` + `notificationclick`). Pas de cache.
- `src/components/PushBell.tsx` : souscription web push VAPID + `/api/push/subscribe`. Enregistre `/sw.js` seulement au subscribe.
- Events Plausible : pattern inline `window.plausible?.("Event", { props })`, init dans `src/app/[locale]/layout.tsx:116-118`.
- i18n : `src/messages/{22}.json`, `npm run check:i18n` exige la parité de clés sur les 22 fichiers.
- Git : branche `feat/app-companion` depuis `master` (convention repo). `main` = prod.

**Contrainte RGPD (privacy policy « we do not track ») :** le beacon n'envoie JAMAIS d'identifiant : uniquement des props catégorielles (`visit_number` plafonné, `days_since_first` bucketé, `bucket`). L'état reste dans le localStorage du visiteur.

---

### Task 0: Branche de chantier

- [ ] **Step 1: Créer la branche**

```bash
cd C:\Users\fkerj\cretepulse-build
git checkout master && git checkout -b feat/app-companion
```

Note : `master` local contient le merge `feat/citybus-bidirectional` (5a6573e). Au moment du deploy prod, vérifier avec Kami que ce merge est bien GO pour `main` (sinon rebaser la branche sur `origin/main`).

---

### Task 1: Module pur de rétention `src/lib/retention.ts`

**Files:**
- Create: `src/lib/retention.ts`
- Create: `scripts/check-retention.mjs`
- Modify: `package.json` (script `check:retention` + chaîne `check`)

- [ ] **Step 1: Écrire le check qui échoue** — `scripts/check-retention.mjs` :

```js
// scripts/check-retention.mjs — tests purs du module de rétention (lot 0 app compagnon).
import assert from "node:assert/strict";
import { computeRetention, RETENTION_STORAGE_KEY } from "../src/lib/retention.ts";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-07-10T09:00:00Z");
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("clé de stockage stable", () => {
  assert.equal(RETENTION_STORAGE_KEY, "cd_visit");
});

ok("première visite = new, visit_number 1, days 0", () => {
  const { props, next } = computeRetention(null, T0);
  assert.deepEqual(props, { visit_number: "1", days_since_first: "0", bucket: "new" });
  assert.deepEqual(next, { f: T0, l: T0, n: 1 });
});

ok("état corrompu traité comme première visite", () => {
  const { props } = computeRetention("{garbage", T0);
  assert.equal(props.bucket, "new");
});

ok("retour même jour = same_day, visit_number incrémenté", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 1 });
  const { props, next } = computeRetention(prev, T0 + 3 * 60 * 60 * 1000);
  assert.equal(props.bucket, "same_day");
  assert.equal(props.visit_number, "2");
  assert.equal(props.days_since_first, "0");
  assert.equal(next.n, 2);
  assert.equal(next.f, T0); // firstSeen jamais réécrit
});

ok("retour lendemain = d1", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 1 });
  const { props } = computeRetention(prev, T0 + 1 * DAY + 60000);
  assert.equal(props.bucket, "d1");
  assert.equal(props.days_since_first, "1");
});

ok("retour J+3 = d2_7", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 2 });
  const { props } = computeRetention(prev, T0 + 3 * DAY);
  assert.equal(props.bucket, "d2_7");
});

ok("retour J+9 = d8_plus", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 2 });
  const { props } = computeRetention(prev, T0 + 9 * DAY);
  assert.equal(props.bucket, "d8_plus");
});

ok("bucket calculé sur lastSeen, pas firstSeen (J+2 revu chaque jour = d1)", () => {
  const prev = JSON.stringify({ f: T0, l: T0 + 1 * DAY, n: 2 });
  const { props } = computeRetention(prev, T0 + 2 * DAY);
  assert.equal(props.bucket, "d1");
  assert.equal(props.days_since_first, "2");
});

ok("visit_number plafonné à 50 (cardinalité Plausible)", () => {
  const prev = JSON.stringify({ f: T0, l: T0, n: 400 });
  const { props, next } = computeRetention(prev, T0 + 1000);
  assert.equal(props.visit_number, "50+");
  assert.equal(next.n, 401); // le compteur interne continue
});

ok("days_since_first plafonné à 30+", () => {
  const prev = JSON.stringify({ f: T0, l: T0 + 44 * DAY, n: 5 });
  const { props } = computeRetention(prev, T0 + 45 * DAY);
  assert.equal(props.days_since_first, "30+");
});

console.log(`✅ check:retention : ${n} tests OK`);
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node --experimental-strip-types scripts/check-retention.mjs`
Expected: FAIL (Cannot find module '../src/lib/retention.ts')

- [ ] **Step 3: Implémenter `src/lib/retention.ts`**

```ts
// src/lib/retention.ts — calcul PUR des props de rétention (lot 0 app compagnon).
// RGPD : aucune donnée personnelle ; l'état reste dans le localStorage du visiteur,
// seules des props catégorielles plafonnées partent vers Plausible.

export const RETENTION_STORAGE_KEY = "cd_visit";

export type StoredVisit = { f: number; l: number; n: number }; // firstSeen, lastSeen, count
export type RetentionProps = {
  visit_number: string;      // "1".."50" puis "50+"
  days_since_first: string;  // "0".."30" puis "30+"
  bucket: "new" | "same_day" | "d1" | "d2_7" | "d8_plus";
};

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: number, b: number): number {
  // Jours calendaires UTC : un retour à 23h59 puis 00h01 compte comme J+1.
  return Math.floor(b / DAY) - Math.floor(a / DAY);
}

export function computeRetention(
  raw: string | null,
  now: number,
): { props: RetentionProps; next: StoredVisit } {
  let prev: StoredVisit | null = null;
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<StoredVisit>;
      if (typeof p.f === "number" && typeof p.l === "number" && typeof p.n === "number") {
        prev = p as StoredVisit;
      }
    } catch {
      prev = null;
    }
  }

  if (!prev) {
    return {
      props: { visit_number: "1", days_since_first: "0", bucket: "new" },
      next: { f: now, l: now, n: 1 },
    };
  }

  const sinceLast = daysBetween(prev.l, now);
  const sinceFirst = daysBetween(prev.f, now);
  const bucket: RetentionProps["bucket"] =
    sinceLast <= 0 ? "same_day" : sinceLast === 1 ? "d1" : sinceLast <= 7 ? "d2_7" : "d8_plus";
  const count = prev.n + 1;

  return {
    props: {
      visit_number: count > 50 ? "50+" : String(count),
      days_since_first: sinceFirst > 30 ? "30+" : String(Math.max(0, sinceFirst)),
      bucket,
    },
    next: { f: prev.f, l: now, n: count },
  };
}
```

- [ ] **Step 4: Vérifier le pass**

Run: `node --experimental-strip-types scripts/check-retention.mjs`
Expected: `✅ check:retention : 10 tests OK`

- [ ] **Step 5: Câbler dans package.json** — ajouter dans `"scripts"` :

```json
"check:retention": "node --experimental-strip-types scripts/check-retention.mjs",
```

et insérer `npm run check:retention && ` au début de la chaîne du script `"check"` existant.

- [ ] **Step 6: Commit**

```bash
git add src/lib/retention.ts scripts/check-retention.mjs package.json
git commit -m "feat(app): module pur retention (lot 0) + check:retention"
```

---

### Task 2: Beacon client `RetentionBeacon` monté dans le layout

**Files:**
- Create: `src/components/RetentionBeacon.tsx`
- Modify: `src/app/[locale]/layout.tsx` (montage à côté d'`ActivityNudge`)

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/RetentionBeacon.tsx — lot 0 app compagnon.
// Envoie UNE FOIS par session l'event Plausible "retention" avec des props
// catégorielles (aucun identifiant). État = localStorage du visiteur.
"use client";
import { useEffect } from "react";
import { computeRetention, RETENTION_STORAGE_KEY } from "@/lib/retention";

const SESSION_GUARD = "cd_r_sent";

export function RetentionBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_GUARD)) return;
      const { props, next } = computeRetention(
        localStorage.getItem(RETENTION_STORAGE_KEY),
        Date.now(),
      );
      localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(next));
      sessionStorage.setItem(SESSION_GUARD, "1");
      window.plausible?.("retention", { props });
    } catch {
      // localStorage indisponible (navigation privée stricte) : on ne mesure pas, on ne casse rien.
    }
  }, []);
  return null;
}
```

Note : `window.plausible` est déjà typé pour les composants existants (même pattern que `NearMeClient.tsx:323`). Si `tsc` râle sur le type, réutiliser la déclaration existante du repo (chercher `declare global` + `plausible` avant d'en créer une).

- [ ] **Step 2: Monter dans `src/app/[locale]/layout.tsx`**

Import : `import { RetentionBeacon } from "@/components/RetentionBeacon";`
Dans le JSX, après `<ActivityNudge />` (ligne ~108) :

```tsx
          <ActivityNudge />
          <RetentionBeacon />
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/RetentionBeacon.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(app): beacon retention Plausible monte dans le layout (lot 0)"
```

---

### Task 3: Clés i18n `installBanner` (parité 22 locales)

**Files:**
- Create (temporaire): `scripts/oneshot-install-banner-i18n.mjs`
- Modify: `src/messages/*.json` (22 fichiers, via le script)

- [ ] **Step 1: Écrire le script d'injection one-shot**

```js
// scripts/oneshot-install-banner-i18n.mjs — injecte le namespace installBanner
// dans les 22 locales (parité check:i18n). À supprimer après exécution.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const T = {
  en: { title: "Keep Crete in your pocket", body: "Live buses and beaches, even offline.", cta: "Install", later: "Not now", ios: "Tap Share, then “Add to Home Screen”." },
  fr: { title: "Garde la Crète dans ta poche", body: "Bus en direct et plages, même hors connexion.", cta: "Installer", later: "Plus tard", ios: "Touche Partager, puis « Sur l'écran d'accueil »." },
  de: { title: "Kreta immer dabei", body: "Live-Busse und Strände, auch offline.", cta: "Installieren", later: "Später", ios: "Tippe auf Teilen, dann „Zum Home-Bildschirm“." },
  el: { title: "Η Κρήτη στην τσέπη σου", body: "Λεωφορεία live και παραλίες, ακόμα και offline.", cta: "Εγκατάσταση", later: "Όχι τώρα", ios: "Πάτησε Κοινοποίηση και μετά «Προσθήκη στην αφετηρία»." },
  it: { title: "Creta sempre in tasca", body: "Bus in diretta e spiagge, anche offline.", cta: "Installa", later: "Non ora", ios: "Tocca Condividi, poi “Aggiungi alla schermata Home”." },
  nl: { title: "Kreta altijd op zak", body: "Live bussen en stranden, ook offline.", cta: "Installeren", later: "Niet nu", ios: "Tik op Delen en dan “Zet op beginscherm”." },
  pl: { title: "Kreta zawsze pod ręką", body: "Autobusy na żywo i plaże, także offline.", cta: "Zainstaluj", later: "Nie teraz", ios: "Stuknij Udostępnij, potem „Do ekranu początkowego”." },
  es: { title: "Creta siempre en tu bolsillo", body: "Buses en directo y playas, incluso sin conexión.", cta: "Instalar", later: "Ahora no", ios: "Toca Compartir y luego “Añadir a pantalla de inicio”." },
  pt: { title: "Creta sempre no bolso", body: "Autocarros ao vivo e praias, mesmo offline.", cta: "Instalar", later: "Agora não", ios: "Toca em Partilhar e depois “Adicionar ao ecrã principal”." },
  ru: { title: "Крит всегда под рукой", body: "Автобусы в реальном времени и пляжи, даже офлайн.", cta: "Установить", later: "Не сейчас", ios: "Нажмите «Поделиться», затем «На экран “Домой”»." },
  ja: { title: "クレタ島をポケットに", body: "バスの現在位置とビーチ情報、オフラインでも。", cta: "インストール", later: "あとで", ios: "共有をタップし、「ホーム画面に追加」を選択。" },
  ko: { title: "크레타를 주머니 속에", body: "실시간 버스와 해변 정보, 오프라인에서도.", cta: "설치", later: "나중에", ios: "공유를 누른 뒤 “홈 화면에 추가”를 선택하세요." },
  zh: { title: "把克里特装进口袋", body: "实时公交和海滩信息，离线也能用。", cta: "安装", later: "以后再说", ios: "点按分享，然后选择“添加到主屏幕”。" },
  tr: { title: "Girit hep cebinde", body: "Canlı otobüsler ve plajlar, çevrimdışı bile.", cta: "Yükle", later: "Şimdi değil", ios: "Paylaş'a dokun, sonra “Ana Ekrana Ekle”yi seç." },
  sv: { title: "Kreta i fickan", body: "Bussar i realtid och stränder, även offline.", cta: "Installera", later: "Inte nu", ios: "Tryck på Dela och sedan “Lägg till på hemskärmen”." },
  da: { title: "Kreta i lommen", body: "Busser live og strande, også offline.", cta: "Installér", later: "Ikke nu", ios: "Tryk på Del og derefter “Føj til hjemmeskærm”." },
  no: { title: "Kreta i lomma", body: "Busser i sanntid og strender, også uten nett.", cta: "Installer", later: "Ikke nå", ios: "Trykk på Del og deretter “Legg til på Hjem-skjermen”." },
  fi: { title: "Kreeta taskussasi", body: "Bussit reaaliajassa ja rannat, myös offline.", cta: "Asenna", later: "Ei nyt", ios: "Napauta Jaa ja sitten ”Lisää Koti-valikkoon”." },
  cs: { title: "Kréta vždy po ruce", body: "Autobusy živě a pláže, i offline.", cta: "Nainstalovat", later: "Teď ne", ios: "Klepni na Sdílet a pak „Přidat na plochu“." },
  hu: { title: "Kréta mindig nálad", body: "Élő buszok és strandok, offline is.", cta: "Telepítés", later: "Most nem", ios: "Koppints a Megosztásra, majd „Hozzáadás a kezdőképernyőhöz”." },
  ro: { title: "Creta mereu în buzunar", body: "Autobuze live și plaje, chiar și offline.", cta: "Instalează", later: "Nu acum", ios: "Atinge Distribuie, apoi „Adaugă la ecranul principal”." },
  ar: { title: "كريت في جيبك دائمًا", body: "حافلات مباشرة وشواطئ، حتى دون اتصال.", cta: "تثبيت", later: "ليس الآن", ios: "اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»." },
};

const dir = path.resolve("src/messages");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const locale = file.replace(".json", "");
  const p = path.join(dir, file);
  const data = JSON.parse(readFileSync(p, "utf8"));
  data.installBanner = T[locale] ?? T.en;
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`${file}: installBanner ${T[locale] ? "traduit" : "fallback EN"}`);
}
```

- [ ] **Step 2: Exécuter puis vérifier la parité**

Run: `node scripts/oneshot-install-banner-i18n.mjs && npm run check:i18n`
Expected: 22 lignes « traduit », puis `✅ check:i18n : 22 locales en parite (149 cles chacune)`.
⚠️ Vérifier au diff que le formatage JSON des fichiers messages n'a pas bougé ailleurs (indentation 2 espaces attendue) ; si le repo utilise un autre formatage, adapter `JSON.stringify(..., null, 2)`.

- [ ] **Step 3: Supprimer le script one-shot et committer**

```bash
rm scripts/oneshot-install-banner-i18n.mjs
git add src/messages/*.json
git commit -m "i18n(app): namespace installBanner 22 locales (lot 1)"
```

---

### Task 4: Composant `InstallBanner` + events de mesure

**Files:**
- Create: `src/components/InstallBanner.tsx`
- Modify: `src/app/[locale]/layout.tsx` (montage global)

Comportement (spec §écran 4) : mobile uniquement, jamais en standalone, uniquement sur les
surfaces outils (`/buses*`, `/explore`, `/live`, `/beaches*`), après 15 s de présence
(proxy « interaction réussie » v1), dismiss mémorisé 14 jours. Events Plausible :
`install_banner_shown`, `install_banner_click` (props.mode = `native` | `ios_hint`),
`install_banner_dismiss`, `pwa_installed` (listener `appinstalled`).

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/InstallBanner.tsx — lot 1 app compagnon.
// Bannière d'installation PWA contextuelle + events de mesure du lot 0.
// Gates : mobile, non-standalone, pages outils, 15s de présence, dismiss 14j.
"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const HIDE_KEY = "cd_install_hidden"; // timestamp ms du dismiss
const HIDE_DAYS = 14;
const SHOW_DELAY_MS = 15_000;
const TOOL_PAGES = /\/(buses|explore|live|beaches)(\/|$)/;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const t = useTranslations("installBanner");
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"native" | "ios_hint">("ios_hint");
  const [showIosSteps, setShowIosSteps] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  // Capte beforeinstallprompt (Chrome/Android) dès que possible, page entière.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setMode("native");
    };
    const onInstalled = () => {
      window.plausible?.("pwa_installed");
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Gates + timer d'affichage.
  useEffect(() => {
    setVisible(false);
    setShowIosSteps(false);
    try {
      if (!TOOL_PAGES.test(pathname ?? "")) return;
      if (isStandalone()) return;
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      if (!coarse) return;
      const hidden = Number(localStorage.getItem(HIDE_KEY) || 0);
      if (hidden && Date.now() - hidden < HIDE_DAYS * 24 * 60 * 60 * 1000) return;
      const isiOS = /iP(hone|ad|od)/.test(navigator.userAgent);
      // Android sans beforeinstallprompt (déjà installée ou non éligible) : rien.
      const timer = setTimeout(() => {
        if (!isiOS && !deferred.current) return;
        setVisible(true);
        window.plausible?.("install_banner_shown", {
          props: { mode: deferred.current ? "native" : "ios_hint" },
        });
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    } catch {
      return;
    }
  }, [pathname]);

  function dismiss() {
    try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch {}
    window.plausible?.("install_banner_dismiss");
    setVisible(false);
  }

  async function install() {
    window.plausible?.("install_banner_click", { props: { mode } });
    if (deferred.current) {
      const p = deferred.current;
      deferred.current = null;
      await p.prompt();
      setVisible(false);
    } else {
      setShowIosSteps(true); // iOS : pas d'API, on montre le geste Partager
    }
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border-2 border-ink bg-white p-3 shadow-lg md:hidden">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="m-0 font-heading text-sm font-bold text-ink">{t("title")}</p>
          <p className="m-0 text-xs text-text-muted">
            {showIosSteps ? t("ios") : t("body")}
          </p>
        </div>
        {!showIosSteps && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-xl border-2 border-ink bg-warn px-3 py-2 font-heading text-xs font-bold text-ink"
          >
            {t("cta")}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("later")}
          className="shrink-0 p-1 text-text-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Monter dans `src/app/[locale]/layout.tsx`** (après `<RetentionBeacon />`) :

```tsx
          <RetentionBeacon />
          <InstallBanner />
```

avec l'import `import { InstallBanner } from "@/components/InstallBanner";`.
NB : `InstallBanner` utilise `useTranslations`, il doit rester DANS `NextIntlClientProvider` (c'est le cas à cet emplacement).

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run check:i18n`
Expected: 0 erreur, parité OK.

- [ ] **Step 4: Vérification visuelle locale**

Run: `npm run dev`, ouvrir `http://localhost:3000/fr/buses` en DevTools mode mobile (pointer coarse), attendre 15 s.
Expected: bannière visible en bas (sur Chrome desktop en émulation, `beforeinstallprompt` peut ne pas tirer : forcer `ios_hint` en testant avec UA iPhone). Vérifier le dismiss (croix) puis recharger : plus de bannière.

- [ ] **Step 5: Commit**

```bash
git add src/components/InstallBanner.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(app): banniere install PWA contextuelle + events mesure (lots 0-1)"
```

---

### Task 5: Service worker — cache offline des pages bus + enregistrement au chargement

**Files:**
- Modify: `public/sw.js` (AJOUTER le cache, NE PAS toucher aux handlers push existants)
- Create: `src/components/SwRegister.tsx`
- Modify: `src/app/[locale]/layout.tsx` (montage)

- [ ] **Step 1: Étendre `public/sw.js`** — ajouter EN TÊTE de fichier (avant le handler `push`) :

```js
// ---- Offline bus (lot 1 app compagnon) ----
// Network-first sur les navigations /buses* : en ligne on sert le réseau et on
// met en cache ; hors ligne on ressert la dernière version vue. Rien d'autre
// n'est caché (pages ISR 22 locales + contenu éditorial restent réseau pur).
const PAGE_CACHE = "cd-bus-pages-v1";
const BUS_PATH = /\/(buses)(\/|$)/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("cd-") && k !== PAGE_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !BUS_PATH.test(url.pathname)) return;
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(PAGE_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })(),
  );
});
```

- [ ] **Step 2: Créer `src/components/SwRegister.tsx`**

```tsx
// src/components/SwRegister.tsx — enregistre le service worker au chargement
// (avant : enregistré seulement au subscribe push via PushBell). Idempotent.
"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
```

- [ ] **Step 3: Monter dans le layout** (après `<InstallBanner />`) :

```tsx
          <InstallBanner />
          <SwRegister />
```

avec l'import `import { SwRegister } from "@/components/SwRegister";`.

- [ ] **Step 4: Vérification manuelle offline**

Run: `npm run build && npm run start`, ouvrir `http://localhost:3000/en/buses/chania-to-heraklion`, DevTools > Application > Service worker actif, puis Network > Offline, recharger.
Expected: la page se recharge depuis le cache (network-first fallback). Une page /buses jamais visitée reste en erreur offline (attendu). Vérifier aussi que PushBell fonctionne toujours (pas de régression : `navigator.serviceWorker.getRegistration()` trouve le SW).

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/components/SwRegister.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(app): offline network-first pages bus + SW enregistre au chargement (lot 1)"
```

---

### Task 6: Manifest enrichi

**Files:**
- Modify: `src/app/manifest.ts`

- [ ] **Step 1: Enrichir le manifest** — remplacer le retour par :

```ts
  return {
    id: "/",
    name: "Crete Direct",
    short_name: "Crete Direct",
    description: "Crete live: buses with real GPS, beach conditions, practical info.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07374A",
    theme_color: "#07374A",
    categories: ["travel", "navigation"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Live buses", url: "/live", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Beaches today", url: "/beaches/today", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
```

⚠️ `purpose: "maskable"` réutilise icon-512 : vérifier visuellement (https://maskable.app ou DevTools) que la chèvre n'est pas trop rognée en cercle ; si oui, retirer la ligne maskable (backlog : icône dédiée avec safe zone).

- [ ] **Step 2: Vérifier + commit**

Run: `npx tsc --noEmit`
Expected: 0 erreur (MetadataRoute.Manifest accepte id/scope/orientation/categories/shortcuts).

```bash
git add src/app/manifest.ts
git commit -m "feat(app): manifest PWA enrichi (id, scope, maskable, shortcuts)"
```

---

### Task 7: Vert global, preview, deploy

- [ ] **Step 1: Chaîne complète**

Run: `npm run check && npm run build`
Expected: tous les checks OK (dont le nouveau check:retention), build vert.
NB connu : `check:da` global peut être rouge sur des dettes préexistantes hors patch — contrôler que AUCUNE violation ne vient des fichiers du chantier.

- [ ] **Step 2: Push preview**

```bash
git push origin feat/app-companion
```

Expected: URL preview Vercel générée. Vérifier sur mobile réel (Android Chrome) : bannière après 15 s sur /buses, install native, offline après visite.

- [ ] **Step 3: Merge + deploy prod (après GO Kami sur la preview)**

```bash
git checkout master && git merge feat/app-companion
git push origin master:main
```

⚠️ AVANT ce push : confirmer que le merge citybus-bidirectionnel présent sur master est GO prod (sinon il partirait avec).

- [ ] **Step 4: Post-deploy — armer le suivi de mesure**

Requête de suivi (à rejouer à J+7 et J+21, depuis le PC) :

```bash
ssh kairos-vps "docker exec plausible-plausible_events_db-1 clickhouse-client --query \"
SELECT JSONExtractString(toString(prop), 'bucket') AS bucket, count() AS n
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name = 'retention' AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY bucket ORDER BY n DESC FORMAT PrettyCompact\""
```

(La forme exacte de lecture des props ClickHouse est à ajuster au premier run : Plausible CE
stocke les props dans les colonnes `Map` `meta.key`/`meta.value` — variante :
`SELECT meta.value[indexOf(meta.key, 'bucket')] AS bucket, count() ...`.)

Critères GO/NO-GO stores (spec) : retour J+1 (`bucket=d1`) ≥ 8 % des mobiles features outils,
OU `install_banner_click` ≥ 3 % des `install_banner_shown`, sur ~3 semaines de saison.

- [ ] **Step 5: Mémoire**

Mettre à jour `project_crete_direct.md` (section app compagnon : lots 0-1 déployés, requête de
suivi, butoir décision stores) + ligne session_log + index MEMORY.md si nouvelle fiche.
