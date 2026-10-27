// cb_places n'a qu'une description, en anglais : sous /fr /de /el la fiche /explore/[slug]
// sert ce texte avec lang="fr|de|el" (releve du 27/10/2026 : 2 294 fiches x 3 = ~6 900
// pages dupliquees, 65 % du sitemap). Indexable en /en seulement tant qu'il n'y a pas de
// traduction. Le jour ou cb_places porte description_fr/de/el, elargir ici : page et
// sitemap suivent.
export const EXPLORE_LOCALES: readonly string[] = ["en"];
