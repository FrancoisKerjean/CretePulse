# Refonte home crete.direct — plus catchy

**Date** : 2026-05-16
**Auteur** : Kami + Claude
**Statut** : design validé, à implémenter

## Contexte

La home crete.direct dans son état actuel souffre de deux problèmes :

1. La rubrique **événements** prend trop de place dans la sidebar droite alors qu'elle a peu d'intérêt (volume faible, intérêt visiteur modéré).
2. La rubrique **guides éditoriaux** est reléguée tout en bas dans une section scrollable, alors qu'elle est un fort hook éditorial et un levier SEO/AEO.

Décision : remonter les guides en parité visuelle avec les news, compresser les events en bandeau ticker discret.

## Décisions verrouillées

| Sujet | Décision |
|-------|----------|
| Position events | Bandeau ticker terra ~50px, après main content |
| Position guides | Dans le main content, parité visuelle avec news |
| Grille main content | `lg:grid-cols-12` → News 5/12, Guides 5/12, Sidebar 2/12 |
| Section guides du bas | Conservée mais transformée en « Plus de guides » compact (grid 3 col, cards visuelles, guides 5-12) |
| Mobile order | News → Guides → Sidebar (ordre HTML naturel) |
| Section guides scrollable max-h-560px | Supprimée, remplacée par grid 3 col simple |
| Quick link « Guides » sidebar | Supprimé (redondant avec section guides parité) |
| Fire alerts | Conservé, déplacé dans sidebar 2/12 (ligne compacte) |
| Newsletter | Conservée, déplacée dans sidebar 2/12 (form vertical) |

## Architecture cible

### Ordre des sections (top → bottom)

```
1. HERO  (80vh, image Pexels, inchangé)
2. NEWS TICKER  (Marquee aegean, inchangé)
3. WEATHER STRIP  (6 villes, inchangé)
4. STATS BAR  (4 chiffres animés, inchangé)
5. MAINTENANCE BANNER  (conditionnel, inchangé)
6. MAIN CONTENT  ← REFACTORÉ
   ├── News  (col-span-5)
   ├── Guides  (col-span-5)  NOUVEAU
   └── Sidebar  (col-span-2)
       ├── Newsletter form vertical compact
       └── Fire alerts ligne
7. EVENTS TICKER  NOUVEAU  (Marquee terra, conditionnel)
8. MORE GUIDES  ← TRANSFORMÉ
   (grid-cols-3, cards visuelles, guides slice 4-12)
9. EXPLORE BENTO  (4 cards, inchangé)
```

### Composants détaillés

#### News (col-span-5)

Aucun changement structurel par rapport à l'existant lignes 295-376 de `HomeClient.tsx`. Seul changement : `lg:col-span-7` → `lg:col-span-5`.

- Header : `<Newspaper /> {t("latestNews")}` aegean uppercase tracking + lien `/news`
- 2 featured cards en `grid-cols-2 gap-4` (h-56, gradient aegean)
- Liste `restNews` (slice 2) avec barre verticale border + titre + meta

#### Guides (col-span-5) — NOUVEAU

Bloc miroir de la section News, avec source `latestGuides.slice(0, 8)`.

- Header : `<BookOpen /> {t("editorialGuides")}` aegean uppercase tracking + lien `/articles`
- 2 featured guides cards `featuredGuide` + `secondGuide` en `grid-cols-2 gap-4` (h-56) :
  - Background = `guide.image_url` via `<Image fill object-cover>` si présent
  - Fallback = gradient `from-aegean via-[#1a5f82] to-[#2D6A8F]` (mêmes tons que les news featured)
  - Overlay `bg-gradient-to-t from-black/70 via-black/10 to-transparent`
  - Badge catégorie + read_time + titre Playfair
- Liste `restGuides` (slice 2, 8) en stack vertical avec thumb 60×60 + titre + catégorie + read_time

#### Sidebar (col-span-2) — REFACTORÉE

Largeur estimée sur desktop max-w-6xl : ~140-160px utiles. Form vertical obligatoire.

**Newsletter** :
```tsx
<section className="rounded-2xl border border-border bg-white p-4">
  <div className="flex flex-col items-start gap-2 mb-3">
    <div className="w-9 h-9 rounded-lg bg-aegean/8 flex items-center justify-center">
      <Mail className="w-4 h-4 text-aegean" />
    </div>
    <h3 className="font-bold text-xs text-text">{t("newsletter")}</h3>
  </div>
  <NewsletterFormCompact locale={locale} />
</section>
```

Nouveau composant `NewsletterFormCompact` (variante interne de `NewsletterForm`) : input email + bouton stacked en `flex-col gap-2`, font-size text-xs, padding réduit.

**Fire alerts** : conservé tel quel mais en pleine largeur sidebar (plus de grid-cols-2). Hauteur réduite.

```tsx
<Link href="/fire-alerts" className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-all">
  <Flame className="w-4 h-4 text-red-500 shrink-0" />
  <div>
    <p className="text-xs font-bold text-red-700">{t("fireLabel")}</p>
    <p className="text-[9px] text-red-400 leading-tight">{t("fireDesc")}</p>
  </div>
</Link>
```

#### Events ticker — NOUVEAU

Affichage conditionnel : `upcomingEvents.length > 0`.

```tsx
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
```

Position : juste après `</div>` du main content, avant `{latestGuides.length > 0 && ...}`.

#### More guides — TRANSFORMÉE

Remplace la section actuelle lignes 472-575. Plus de mask gradient ni de scroll forcé.

```tsx
{latestGuides.length > 4 && (
  <section className="border-t border-border bg-surface py-14 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-2 flex items-center gap-3"
              style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            <BookOpen className="w-7 h-7 text-aegean" />
            {t("moreGuides")}
          </h2>
          <p className="text-text-muted text-sm max-w-lg">{t("guidesSectionSubtitle")}</p>
        </div>
        <Link href="/articles" className="hidden sm:flex shrink-0 text-xs text-aegean ...">
          {t("allGuides")} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestGuides.slice(4).map((guide, idx) => (
          <li key={guide.slug}>
            <BlurFade delay={Math.min(0.04 * idx, 0.4)}>
              <Link href={`/articles/${guide.slug}`} className="block group rounded-2xl border border-border bg-white overflow-hidden hover:border-aegean/40 hover:shadow-md transition-all h-full">
                <div className="relative aspect-[16/9] bg-stone overflow-hidden">
                  {guide.image_url ? (
                    <Image src={guide.image_url} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
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
        ))}
      </ul>
    </div>
  </section>
)}
```

### Suppressions

- Section Events de la sidebar droite actuelle (lignes 382-435) → remplacée par le ticker
- Quick link « Guides » de la grid-cols-2 quick links (lignes 460-466)
- Grid-cols-2 quick links (lignes 452-467) → fire alerts seul remonte dans sidebar
- Section LATEST GUIDES actuelle (lignes 472-575) → transformée en More guides simplifiée

## Fichiers touchés

| Fichier | Type | Changement |
|---------|------|-----------|
| `src/components/home/HomeClient.tsx` | Refactor | Restructuration main content, suppression sidebar events, nouveau bloc Guides parité, nouveau composant NewsletterFormCompact, nouveau ticker events, transformation section guides bas |
| `src/messages/en.json` | Ajout clés | `editorialGuides`, `moreGuides` |
| `src/messages/fr.json` | Ajout clés | `editorialGuides`, `moreGuides` |
| `src/messages/de.json` | Ajout clés | `editorialGuides`, `moreGuides` |
| `src/messages/el.json` | Ajout clés | `editorialGuides`, `moreGuides` |
| `src/app/[locale]/page.tsx` | Aucun | Les 4 datasets déjà fetched, `revalidate = 7200` conservé |

### Nouvelles clés i18n

```json
{
  "home": {
    "editorialGuides": {
      "en": "Editorial guides",
      "fr": "Guides éditoriaux",
      "de": "Redaktionelle Guides",
      "el": "Συντακτικοί οδηγοί"
    },
    "moreGuides": {
      "en": "More guides",
      "fr": "Plus de guides",
      "de": "Weitere Guides",
      "el": "Περισσότεροι οδηγοί"
    }
  }
}
```

## Critères de succès

1. Build Next.js passe sans warning (`npm run build`)
2. Aucune régression visuelle sur hero, weather strip, stats bar, explore bento (mêmes composants, mêmes props)
3. Sur desktop max-w-6xl, sidebar 2/12 ne déborde pas et reste lisible (test : 4 langues, 2 cases edge `<button>` long)
4. Sur mobile (< 1024px), stack vertical News → Guides → Sidebar → Events ticker → More guides → Explore
5. Events ticker invisible si `upcomingEvents.length === 0` (graceful degradation)
6. Section More guides invisible si `latestGuides.length <= 4`
7. Aucun impact SEO : mêmes URLs, mêmes contenus, sitemap inchangé
8. Lighthouse score conservé ≥ niveau actuel (test avant/après en preview Vercel)

## Risques identifiés

| Risque | Probabilité | Mitigation |
|--------|-------------|-----------|
| Sidebar 2/12 (~140px) trop étroite pour le bouton newsletter | Moyenne | Stack vertical, font-size text-xs, padding compact, ellipsis sur texte long |
| Featured guides sans `image_url` rendus moches | Faible | Fallback gradient déjà géré dans le code actuel, conservé |
| Volume guides < 4 → main content déséquilibré (news 8 vs guides 2) | Faible | Si `latestGuides.length < 4`, afficher placeholder cards ou simplement laisser le slot vide (à voir en preview) |
| Marquee terra trop bruyante (mêmes pixels que le ticker aegean au-dessus) | Moyenne | Position en bas du main content, séparée visuellement par les blocs news/guides |
| Mobile : trop de scroll vertical (5 sections empilées) | Moyenne | Acceptable car premier-fold hero+ticker+stats reste dense, le scroll est attendu pour un site éditorial |

## Hors scope

- Refonte hero (gardé tel quel)
- Modification stats bar
- Modification explore bento
- Animation supplémentaire (BlurFade et SpotlightCard suffisent)
- A/B testing (déploiement direct, pas de variant)
- Changement de palette couleurs ou typo

## Prochaine étape

Une fois la spec approuvée, invoquer la skill `writing-plans` pour produire un plan d'implémentation step-by-step avec checkpoints de review.
