# Refonte home crete.direct catchy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la home crete.direct pour remonter les guides éditoriaux en parité visuelle avec les news, compresser les événements en bandeau ticker discret, et resserrer la sidebar à 2/12 col (newsletter + fire alerts).

**Architecture:** Refactor unique de `src/components/home/HomeClient.tsx` (615 lignes → ~720). Aucun changement de schéma de données, aucune nouvelle requête. Les 4 datasets (cities, latestNews, upcomingEvents, latestGuides 12) sont déjà fetched dans `page.tsx`. Ajout de 2 clés i18n × 4 langues. Pas de nouveau composant fichier — `NewsletterFormCompact` reste inline dans `HomeClient.tsx` à côté de `NewsletterForm` existant.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript, next-intl, lucide-react, MagicUI primitives (Marquee, BlurFade, SpotlightCard, NumberTicker).

**Spec source:** `docs/superpowers/specs/2026-05-16-crete-direct-home-catchy-design.md`

---

## Task 1: Branche + clés i18n nouvelles

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/fr.json`
- Modify: `src/messages/de.json`
- Modify: `src/messages/el.json`

- [ ] **Step 1.1: Créer la branche feature**

Run:
```bash
cd C:/Users/fkerj/cretepulse-build
git checkout main && git pull
git checkout -b feat/home-catchy-redesign
```
Expected: branche `feat/home-catchy-redesign` créée et active.

- [ ] **Step 1.2: Ajouter les 2 clés FR dans `src/messages/fr.json`**

Localiser le bloc `"home"` lignes 15-54. Après la ligne `"allGuides": "Tous les guides"` (ligne 53), modifier la ligne pour ajouter virgule et insérer les 2 nouvelles clés avant la `}` de fermeture du bloc home.

Edit ciblé : remplacer
```json
    "allGuides": "Tous les guides"
  },
```
par
```json
    "allGuides": "Tous les guides",
    "editorialGuides": "Guides éditoriaux",
    "moreGuides": "Plus de guides"
  },
```

- [ ] **Step 1.3: Ajouter les 2 clés EN dans `src/messages/en.json`**

Mêmes positions (ligne 53 `allGuides`). Remplacer la ligne `allGuides` et la `},` qui suit par :
```json
    "allGuides": "All guides",
    "editorialGuides": "Editorial guides",
    "moreGuides": "More guides"
  },
```

- [ ] **Step 1.4: Ajouter les 2 clés DE dans `src/messages/de.json`**

Remplacer
```json
    "allGuides": "Alle Reiseführer"
  },
```
par
```json
    "allGuides": "Alle Reiseführer",
    "editorialGuides": "Redaktionelle Guides",
    "moreGuides": "Weitere Guides"
  },
```

- [ ] **Step 1.5: Ajouter les 2 clés EL dans `src/messages/el.json`**

Remplacer
```json
    "allGuides": "Όλοι οι οδηγοί"
  },
```
par
```json
    "allGuides": "Όλοι οι οδηγοί",
    "editorialGuides": "Συντακτικοί οδηγοί",
    "moreGuides": "Περισσότεροι οδηγοί"
  },
```

- [ ] **Step 1.6: Valider JSON et commit**

Run:
```bash
node -e "['en','fr','de','el'].forEach(l=>JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json')))"
```
Expected: aucune erreur, JSON valides.

Run:
```bash
git add src/messages/en.json src/messages/fr.json src/messages/de.json src/messages/el.json
git commit -m "feat(home): add editorialGuides + moreGuides i18n keys (4 langs)"
```

---

## Task 2: Composant `NewsletterFormCompact` inline

**Files:**
- Modify: `src/components/home/HomeClient.tsx` (insertion après NewsletterForm existant, avant `interface HomeClientProps`)

- [ ] **Step 2.1: Insérer le composant `NewsletterFormCompact`**

Dans `src/components/home/HomeClient.tsx`, après la fin de la fonction `NewsletterForm` (qui termine ligne 119 avec `}`) et avant `interface HomeClientProps` (ligne 121), ajouter cette nouvelle fonction :

```tsx
function NewsletterFormCompact({ locale }: { locale: string }) {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    const successMsg: Record<string, string> = {
      en: "Thanks!",
      fr: "Merci !",
      de: "Danke!",
      el: "Ευχαριστώ!",
    };
    return (
      <div className="rounded-xl bg-aegean p-3 text-white text-center">
        <p className="text-xs font-medium">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        required
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-xs text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-aegean/30 focus:border-aegean/40"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full px-3 py-2 bg-terra text-white rounded-lg font-bold text-xs hover:bg-terra-light transition-colors disabled:opacity-60 shadow-sm"
      >
        {status === "loading" ? "..." : t("subscribe")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2.2: Build local pour valider que TypeScript compile**

Run:
```bash
npm run build
```
Expected: build PASS, pas d'erreur TS. Le composant est inerte (pas encore utilisé).

- [ ] **Step 2.3: Commit**

Run:
```bash
git add src/components/home/HomeClient.tsx
git commit -m "feat(home): add NewsletterFormCompact inline component for sidebar 2/12"
```

---

## Task 3: Ajouter le bloc Guides en parité (col-span-5) dans le main content

**Files:**
- Modify: `src/components/home/HomeClient.tsx` (zones lignes ~136-138 et ~288-376)

- [ ] **Step 3.1: Préparer les variables guides featured**

Dans `HomeClient` (ligne 129+), juste après les déclarations `featuredNews`, `secondNews`, `restNews` (lignes 136-138), ajouter :

Remplacer
```tsx
  const featuredNews = latestNews[0] ?? null;
  const secondNews = latestNews[1] ?? null;
  const restNews = latestNews.slice(2);
```
par
```tsx
  const featuredNews = latestNews[0] ?? null;
  const secondNews = latestNews[1] ?? null;
  const restNews = latestNews.slice(2);

  const featuredGuide = latestGuides[0] ?? null;
  const secondGuide = latestGuides[1] ?? null;
  const restGuides = latestGuides.slice(2, 8);
```

- [ ] **Step 3.2: Modifier le `<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">` pour passer en 5/5/2**

Ligne ~290, remplacer
```tsx
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
```
par
```tsx
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
```

(seule la valeur `gap-10` → `gap-6` change pour laisser de la place à 3 colonnes).

- [ ] **Step 3.3: Changer le col-span du bloc News (gauche)**

Ligne ~293, remplacer
```tsx
          {/* ──── LEFT: News ──── */}
          <div className="lg:col-span-7 space-y-8">
```
par
```tsx
          {/* ──── LEFT: News ──── */}
          <div className="lg:col-span-5 space-y-8">
```

- [ ] **Step 3.4: Insérer le bloc Guides en parité entre la fermeture News et l'ouverture sidebar**

Localiser la fin du bloc news (ligne ~376) où on trouve :
```tsx
            </section>
          </div>

          {/* ──── RIGHT: Events + Newsletter ──── */}
          <div className="lg:col-span-5 space-y-8">
```

Remplacer ce bloc par :
```tsx
            </section>
          </div>

          {/* ──── MIDDLE: Editorial guides (parity with news) ──── */}
          <div className="lg:col-span-5 space-y-8">

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold text-aegean uppercase tracking-[0.2em] flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> {t("editorialGuides")}
                </h2>
                <Link href="/articles" className="text-xs text-aegean hover:text-aegean-light flex items-center gap-1 font-semibold transition-colors">
                  {t("allGuides")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {latestGuides.length > 0 ? (
                <div className="space-y-4">
                  {/* Top 2 featured guides - side by side on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[featuredGuide, secondGuide].filter(Boolean).map((guide, idx) => {
                      const gTitle = getLocalizedGuideField(guide!, "titles", locale);
                      return (
                        <BlurFade key={guide!.slug} delay={idx * 0.1}>
                          <SpotlightCard className="rounded-2xl">
                            <Link
                              href={`/articles/${guide!.slug}`}
                              className="block group rounded-2xl overflow-hidden relative h-56"
                            >
                              {guide!.image_url ? (
                                <Image
                                  src={guide!.image_url}
                                  alt={gTitle}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 33vw"
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className={`absolute inset-0 ${idx === 0 ? "bg-gradient-to-br from-aegean via-[#1a5f82] to-[#2D6A8F]" : "bg-gradient-to-br from-olive via-[#5a7a4a] to-[#7a9a6a]"}`} />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                              <div className="relative h-full flex flex-col justify-end p-5">
                                <div className="flex items-center gap-2 mb-2">
                                  {guide!.category && (
                                    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm">
                                      {guide!.category}
                                    </span>
                                  )}
                                  {guide!.read_time && (
                                    <span className="text-[9px] text-white/60 font-mono">{guide!.read_time} min</span>
                                  )}
                                </div>
                                <h3
                                  className="text-base font-bold text-white leading-snug group-hover:text-sand transition-colors line-clamp-3"
                                  style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
                                >
                                  {gTitle}
                                </h3>
                              </div>
                            </Link>
                          </SpotlightCard>
                        </BlurFade>
                      );
                    })}
                  </div>

                  {/* Rest of guides */}
                  <div className="divide-y divide-border">
                    {restGuides.map((guide, i) => {
                      const gTitle = getLocalizedGuideField(guide, "titles", locale);
                      return (
                        <BlurFade key={guide.slug} delay={0.04 * (i + 1)}>
                          <Link
                            href={`/articles/${guide.slug}`}
                            className="flex items-start gap-3 py-4 group"
                          >
                            <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone relative">
                              {guide.image_url ? (
                                <Image
                                  src={guide.image_url}
                                  alt={gTitle}
                                  fill
                                  sizes="56px"
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-aegean to-aegean-light flex items-center justify-center">
                                  <BookOpen className="w-5 h-5 text-white/70" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
                                {gTitle}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                {guide.category && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-aegean/8 text-aegean">
                                    {guide.category}
                                  </span>
                                )}
                                {guide.read_time && (
                                  <span className="text-[10px] text-text-light font-mono ml-auto">{guide.read_time} min</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </BlurFade>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-border p-10 text-center">
                  <BookOpen className="w-8 h-8 text-text-light mx-auto mb-3" />
                  <p className="text-sm text-text-muted">{t("guidesSectionSubtitle")}</p>
                </div>
              )}
            </section>
          </div>

          {/* ──── RIGHT: Sidebar 2/12 (Newsletter + Fire alerts) ──── */}
          <div className="lg:col-span-2 space-y-4">
```

À ce stade le sidebar va contenir l'ancien code (events + newsletter + quick links 2 col) — c'est OK, on le nettoie en Task 4. La grille devient temporairement 5+5+5=15/12 ce qui sera corrigé visuellement par lg:col-span-5 cassant la grille (3e bloc se met en wrap). On supporte cet état intermédiaire 1 commit max.

- [ ] **Step 3.5: Build local pour valider TypeScript**

Run:
```bash
npm run build
```
Expected: build PASS. Le rendu visuel est temporairement cassé (3 col déséquilibrées), c'est attendu.

- [ ] **Step 3.6: Commit**

Run:
```bash
git add src/components/home/HomeClient.tsx
git commit -m "feat(home): add editorial guides block in parity with news (col-span-5)"
```

---

## Task 4: Refactor sidebar 2/12 (newsletter compact + fire alerts seul)

**Files:**
- Modify: `src/components/home/HomeClient.tsx` (zone sidebar lignes ~378-468 dans le fichier en cours)

- [ ] **Step 4.1: Remplacer tout le contenu de la sidebar par newsletter compact + fire alerts**

Localiser dans le fichier en cours (après les modifs Task 3) le bloc qui commence par `{/* ──── RIGHT: Sidebar 2/12 ... ──── */}` et `<div className="lg:col-span-2 space-y-4">`.

Le contenu actuel (de cette div jusqu'à sa fermeture) contient encore : section Events, section Newsletter (large), grid-cols-2 quick links (fire + guides). Remplacer entièrement le contenu interne par le bloc ci-dessous.

Remplacer le bloc complet (de `<div className="lg:col-span-2 space-y-4">` à sa `</div>` de fermeture, juste avant `</div>` de fermeture du grid-cols-12) par :

```tsx
          <div className="lg:col-span-2 space-y-4">

            {/* Newsletter compact */}
            <section className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-col items-start gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-aegean/8 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-aegean" />
                </div>
                <h3 className="font-bold text-xs text-text leading-tight">{t("newsletter")}</h3>
              </div>
              <NewsletterFormCompact locale={locale} />
            </section>

            {/* Fire alerts compact */}
            <Link
              href="/fire-alerts"
              className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-all group"
            >
              <Flame className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-700">{t("fireLabel")}</p>
                <p className="text-[9px] text-red-400 leading-tight line-clamp-2">{t("fireDesc")}</p>
              </div>
            </Link>

          </div>
```

- [ ] **Step 4.2: Build local**

Run:
```bash
npm run build
```
Expected: build PASS. Visuellement la grille est maintenant correcte sur desktop (5+5+2=12).

- [ ] **Step 4.3: Test visuel local**

Run dans un terminal séparé :
```bash
npm run dev
```
Ouvrir `http://localhost:3000/fr` dans un navigateur.

Vérifier :
- Main content : 3 colonnes News (large) + Guides (large) + Sidebar (mince) sur desktop
- Sidebar contient seulement newsletter compact + fire alerts
- Aucun bloc Events visible dans la sidebar (supprimé)
- Stack vertical correct en mobile (resize navigateur < 1024px)

Arrêter le dev server (Ctrl+C).

- [ ] **Step 4.4: Commit**

Run:
```bash
git add src/components/home/HomeClient.tsx
git commit -m "refactor(home): replace right sidebar events+quicklinks with compact newsletter+fire"
```

---

## Task 5: Ajouter l'Events ticker terra après main content

**Files:**
- Modify: `src/components/home/HomeClient.tsx` (insertion entre fin du grid-cols-12 et début de section LATEST GUIDES)

- [ ] **Step 5.1: Insérer le ticker terra**

Localiser dans le fichier la fin du `<div className="max-w-6xl mx-auto px-4 py-10">` qui contient le main content. Cette div se ferme par `</div>` (la div extérieure du grid 12) suivi de la zone `{/* ═══════════════════ LATEST GUIDES ═══════════════════ */}`.

Insérer le bloc Events ticker juste avant le commentaire `LATEST GUIDES`.

Remplacer
```tsx
      </div>

      {/* ═══════════════════ LATEST GUIDES ═══════════════════ */}
      {latestGuides.length > 0 && (
```
par
```tsx
      </div>

      {/* ═══════════════════ EVENTS TICKER ═══════════════════ */}
      {upcomingEvents.length > 0 && (
        <div className="bg-terra text-white py-2.5 overflow-hidden">
          <Marquee duration={50} pauseOnHover>
            {upcomingEvents.map((event) => (
              <Link
                key={event.slug}
                href={`/events/${event.slug}`}
                className="flex items-center gap-2.5 px-4 text-sm hover:text-sand transition-colors whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/15 font-semibold shrink-0">
                  {formatEventDate(event.date_start, locale)}
                </span>
                <span className="font-medium">{getLocalizedField(event, "title", loc)}</span>
                <MapPin className="w-3 h-3 text-white/50 shrink-0" />
                <span className="text-white/60 text-xs">{localizeLocation(event.location_name, locale)}</span>
                <span className="text-white/20 mx-2">|</span>
              </Link>
            ))}
          </Marquee>
        </div>
      )}

      {/* ═══════════════════ LATEST GUIDES ═══════════════════ */}
      {latestGuides.length > 0 && (
```

- [ ] **Step 5.2: Build local**

Run:
```bash
npm run build
```
Expected: build PASS.

- [ ] **Step 5.3: Commit**

Run:
```bash
git add src/components/home/HomeClient.tsx
git commit -m "feat(home): add terra events ticker after main content (conditional)"
```

---

## Task 6: Transformer la section LATEST GUIDES en grid 3 col simple (More guides, slice 4-12)

**Files:**
- Modify: `src/components/home/HomeClient.tsx` (zone section LATEST GUIDES, lignes après Task 5)

- [ ] **Step 6.1: Remplacer toute la section LATEST GUIDES par More guides simplifiée**

Localiser dans le fichier la section qui commence par `{/* ═══════════════════ LATEST GUIDES ═══════════════════ */}` et `{latestGuides.length > 0 && (`. Cette section va jusqu'à la `)}` de fermeture juste avant `{/* ═══════════════════ EXPLORE BENTO ═══════════════════ */}`.

Remplacer toute cette section (du commentaire LATEST GUIDES jusqu'à sa `)}` finale, soit l'équivalent de l'ancien bloc lignes 472-575 du fichier original) par :

```tsx
      {/* ═══════════════════ MORE GUIDES ═══════════════════ */}
      {latestGuides.length > 4 && (
        <section className="border-t border-border bg-surface py-14 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-6 gap-4">
              <div>
                <BlurFade delay={0.1}>
                  <h2
                    className="text-3xl md:text-4xl font-bold text-text mb-2 flex items-center gap-3"
                    style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
                  >
                    <BookOpen className="w-7 h-7 text-aegean" />
                    {t("moreGuides")}
                  </h2>
                  <p className="text-text-muted text-sm max-w-lg">{t("guidesSectionSubtitle")}</p>
                </BlurFade>
              </div>
              <Link
                href="/articles"
                className="hidden sm:flex shrink-0 text-xs text-aegean hover:text-aegean-light items-center gap-1 font-semibold transition-colors whitespace-nowrap"
              >
                {t("allGuides")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latestGuides.slice(4).map((guide, idx) => {
                const title = getLocalizedGuideField(guide, "titles", locale);
                return (
                  <li key={guide.slug}>
                    <BlurFade delay={Math.min(0.04 * idx, 0.4)}>
                      <Link
                        href={`/articles/${guide.slug}`}
                        className="block group rounded-2xl border border-border bg-white overflow-hidden hover:border-aegean/40 hover:shadow-md transition-all h-full"
                      >
                        <div className="relative aspect-[16/9] bg-stone overflow-hidden">
                          {guide.image_url ? (
                            <Image
                              src={guide.image_url}
                              alt={title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-aegean to-aegean-light flex items-center justify-center">
                              <BookOpen className="w-10 h-10 text-white/70" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {guide.category && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-aegean/8 text-aegean">
                                {guide.category}
                              </span>
                            )}
                            {guide.read_time && (
                              <span className="text-[10px] text-text-light font-mono">{guide.read_time} min</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
                            {title}
                          </p>
                        </div>
                      </Link>
                    </BlurFade>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 sm:hidden">
              <Link
                href="/articles"
                className="text-xs text-aegean hover:text-aegean-light flex items-center gap-1 font-semibold transition-colors"
              >
                {t("allGuides")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

```

- [ ] **Step 6.2: Build local**

Run:
```bash
npm run build
```
Expected: build PASS.

- [ ] **Step 6.3: Test visuel complet local**

Run :
```bash
npm run dev
```
Ouvrir `http://localhost:3000/fr` puis `/en`, `/de`, `/el` successivement.

Vérifier checklist :
- [ ] Hero 80vh inchangé
- [ ] News ticker aegean inchangé
- [ ] Weather strip inchangée
- [ ] Stats bar inchangée
- [ ] Main content : News (5/12) + Guides (5/12) + Sidebar (2/12) sur desktop max-w-6xl
- [ ] News block : 2 featured cards + liste en dessous
- [ ] Guides block : 2 featured cards (avec image_url ou gradient olive fallback) + liste avec thumb 56×56
- [ ] Sidebar : Newsletter compact form vertical + fire alerts ligne. Pas de events, pas de "Guides" link.
- [ ] Events ticker terra défile après le main content (si events.length > 0)
- [ ] More guides : grid 3 col cards 16:9, montre uniquement guides 5+ (les 4 premiers sont dans le main content)
- [ ] Explore bento inchangé
- [ ] Sur mobile (resize navigateur < 1024px) : stack vertical News → Guides → Sidebar → ticker → More guides → Explore

Arrêter le dev server (Ctrl+C).

- [ ] **Step 6.4: Commit**

Run:
```bash
git add src/components/home/HomeClient.tsx
git commit -m "feat(home): transform LATEST GUIDES section into 'More guides' grid 3-col (slice 4+)"
```

---

## Task 7: Push + preview Vercel + validation finale

**Files:**
- Aucun changement code

- [ ] **Step 7.1: Push de la branche**

Run:
```bash
git push -u origin feat/home-catchy-redesign
```
Expected: push OK, Vercel détecte le push et déclenche un preview build automatique.

- [ ] **Step 7.2: Vérifier le preview Vercel**

Attendre 2-3 min puis aller sur https://vercel.com/dashboard pour récupérer l'URL preview de la branche `feat/home-catchy-redesign`.

URL pattern : `https://crete-direct-git-feat-home-catchy-redesign-<scope>.vercel.app`

Tester sur preview :
- [ ] `/fr` : home en français, tout s'affiche
- [ ] `/en` : home en anglais
- [ ] `/de` : home en allemand
- [ ] `/el` : home en grec (vérifier caractères)
- [ ] Mobile responsive (DevTools, iPhone 14 viewport)
- [ ] Lighthouse Performance ≥ 80, SEO ≥ 95 (DevTools → Lighthouse)
- [ ] Aucune erreur 500 ni 404 dans la console
- [ ] Newsletter form fonctionne (soumettre un email test → status success)

- [ ] **Step 7.3: Créer la PR vers main**

Run:
```bash
gh pr create --title "feat(home): refonte catchy — guides en parité news + events ticker" --body "$(cat <<'EOF'
## Summary
- Refonte de la home crete.direct selon spec `docs/superpowers/specs/2026-05-16-crete-direct-home-catchy-design.md`
- Guides éditoriaux remontés dans le main content en parité visuelle avec les news (col-span-5)
- Events compressés en bandeau ticker terra ~50px après le main content
- Sidebar resserrée à 2/12 col (newsletter compact + fire alerts)
- Section guides du bas transformée en grid 3 col simple (More guides, slice 4+)

## Test plan
- [x] Build local PASS
- [x] Visuels desktop FR/EN/DE/EL OK
- [x] Mobile stack vertical OK
- [ ] Preview Vercel validée
- [ ] Lighthouse Performance ≥ 80, SEO ≥ 95
- [ ] Smoke test newsletter subscribe

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR créée, URL retournée.

- [ ] **Step 7.4: Log final dans session_log.md**

Run (PowerShell) :
```powershell
$line = "- 16/05 HH:xx | DEPLOY | **Refonte home crete.direct LIVE preview** [FACT 2026-05-16 source: PR <PR_URL> + branche feat/home-catchy-redesign + spec design 2026-05-16] Guides en parité news (col-span-5/5/2), events en ticker terra ~50px, sidebar compact newsletter+fire. Section bas More guides grid 3 col slice(4+). 7 commits, 1 PR. Validation visuelle preview Vercel OK 4 langues. Merge main = mise en prod."
Add-Content -Path "C:/Users/fkerj/.claude/projects/C--Users-fkerj/memory/session_log.md" -Value $line -Encoding UTF8
```

Remplacer `HH:xx` par l'heure réelle et `<PR_URL>` par l'URL retournée par `gh pr create`.

- [ ] **Step 7.5: Mettre à jour `project_crete_direct.md`**

Editer `C:/Users/fkerj/.claude/projects/C--Users-fkerj/memory/project_crete_direct.md` pour ajouter dans la section history :
```markdown
- **16/05/2026** : Refonte home plus catchy. Guides remontés en parité news (3 col 5/5/2), events compressés en ticker terra, More guides en grid 3 col. PR <URL>. Spec `2026-05-16-crete-direct-home-catchy-design.md`.
```

Puis mettre à jour la ligne MEMORY.md correspondante (rappel règle "index sync obligatoire" : si la description change, re-coudre la ligne MEMORY.md).

---

## Self-review

**Spec coverage** :
- Architecture cible (8 sections) → couverte par Tasks 3, 4, 5, 6
- News col-span-5 → Task 3 Step 3.3
- Guides col-span-5 nouveau → Task 3 Step 3.4
- Sidebar col-span-2 newsletter+fire → Task 4 Step 4.1
- Events ticker terra conditionnel → Task 5 Step 5.1
- More guides grid 3 col slice(4) → Task 6 Step 6.1
- Suppression section events sidebar → Task 4 Step 4.1 (remplacement complet)
- Suppression quick link Guides → Task 4 Step 4.1
- Fire alerts compact sidebar → Task 4 Step 4.1
- NewsletterFormCompact inline → Task 2 Step 2.1
- 2 clés i18n × 4 langues → Task 1 Steps 1.2-1.5
- Mobile order News → Guides → Sidebar → ticker → More guides → Test visuel Task 6 Step 6.3

**Placeholder scan** : aucune occurrence de "TBD", "TODO", "add appropriate", "similar to". Code complet et exact dans chaque step.

**Type consistency** :
- `Guide` type : `image_url: string | null`, `read_time: number | null`, `category: string` — vérifié dans `src/lib/guides.ts` lignes 7-14
- `getLocalizedGuideField(guide, "titles", locale)` — signature vérifiée, importée déjà ligne 20 du HomeClient
- `getLocalizedField(item, "title", loc)` — utilisée pour les news, reprise telle quelle pour events titre
- `formatEventDate(event.date_start, locale)` — fonction existante lignes 41-47
- `localizeLocation(event.location_name, locale)` — importée déjà ligne 19
- `Marquee`, `BlurFade`, `SpotlightCard`, `Calendar`, `MapPin`, `BookOpen`, `Mail`, `Flame`, `Newspaper`, `ChevronRight`, `Image`, `Link` — tous déjà importés en lignes 4-15 et 20

**Risque résiduel identifié** : si `latestGuides.length < 4`, le main content guides peut avoir uniquement 0-2 featured et 0 dans la liste restGuides. Acceptable pour cette version, à raffiner si `latestGuides` est régulièrement vide en prod (à surveiller via Sentry).
