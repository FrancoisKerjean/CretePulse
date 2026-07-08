"use client";

// Wizard lead-gen activités : 4 étapes à grosses cartes cliquables,
// zéro champ texte avant l'étape contact. Le lead part par email Resend chez
// le prestataire (API /api/activities/submit) ; combo sans prestataire → écran
// doux, l'ack noProvider est déjà envoyé côté serveur.
// Clone structurel de CarRentalWizard ; mêmes patterns DA, même i18n inline.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CITIES,
  ACTIVITY_TIMESLOTS,
  GUIDE_LANGUAGES,
  isCategorySlug,
  isCitySlug,
  categoryLabel,
  cityLabel,
} from "@/lib/activity-taxonomy";
import type { ActivityCategorySlug, ActivityCitySlug, ActivityTimeslot, GuideLanguage } from "@/lib/activity-taxonomy";
import { CiMark, CiCompass, CiFood, CiHike, CiFerry } from "@/components/icons";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Date locale YYYY-MM-DD (pas d'UTC : les défauts suivent le fuseau du visiteur). */
function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---- i18n inline 4 langues, fallback EN (pattern CarRentalWizard) -----------

type Strings = {
  title1: string;
  title2: string;
  onRequest: string;
  title3: string;
  dateLabel: string;
  timeslotLabel: string;
  ts_morning: string;
  ts_afternoon: string;
  ts_evening: string;
  ts_flexible: string;
  adultsLabel: string;
  childrenLabel: string;
  title4: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  languageLabel: string;
  noteLabel: string;
  noteHint: string;
  rgpd: string;
  back: string;
  next: string;
  submit: string;
  sending: string;
  sentTitle: string;
  sentBody: string;
  noProviderTitle: string;
  noProviderBody: string;
  error: string;
};

const T: Record<string, Strings> = {
  en: {
    title1: "What type of activity?",
    title2: "Which area?",
    onRequest: "on request",
    title3: "When and how many?",
    dateLabel: "Date",
    timeslotLabel: "Time of day",
    ts_morning: "Morning",
    ts_afternoon: "Afternoon",
    ts_evening: "Evening",
    ts_flexible: "Flexible",
    adultsLabel: "Adults",
    childrenLabel: "Children",
    title4: "Your contact details",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone / WhatsApp (optional)",
    languageLabel: "Guide language",
    noteLabel: "Anything to mention? (optional)",
    noteHint: "Diet, mobility needs, experience level — no personal contact details here.",
    rgpd: "Your details are sent to the local activity provider so they can reply with a quote. Nothing else.",
    back: "Back",
    next: "Continue",
    submit: "Send request",
    sending: "Sending…",
    sentTitle: "Request sent",
    sentBody: "Your request was sent. The local activity provider will reply by email shortly.",
    noProviderTitle: "We're looking for a provider",
    noProviderBody: "No provider is confirmed for this combination yet. We've noted your interest and will email you once one is available.",
    error: "Something went wrong. Please try again in a moment.",
  },
  fr: {
    title1: "Quel type d'activité ?",
    title2: "Quelle zone ?",
    onRequest: "sur demande",
    title3: "Quand et combien ?",
    dateLabel: "Date",
    timeslotLabel: "Moment de la journée",
    ts_morning: "Matin",
    ts_afternoon: "Après-midi",
    ts_evening: "Soir",
    ts_flexible: "Flexible",
    adultsLabel: "Adultes",
    childrenLabel: "Enfants",
    title4: "Vos coordonnées",
    nameLabel: "Nom",
    emailLabel: "Email",
    phoneLabel: "Téléphone / WhatsApp (facultatif)",
    languageLabel: "Langue du guide",
    noteLabel: "Une précision ? (facultatif)",
    noteHint: "Régime alimentaire, mobilité, niveau — pas de coordonnées personnelles ici.",
    rgpd: "Vos coordonnées sont transmises au prestataire local pour qu'il vous réponde avec un devis. Rien d'autre.",
    back: "Retour",
    next: "Continuer",
    submit: "Envoyer la demande",
    sending: "Envoi…",
    sentTitle: "Demande envoyée",
    sentBody: "Votre demande a été envoyée. Le prestataire local vous répondra par email très vite.",
    noProviderTitle: "Nous cherchons un prestataire",
    noProviderBody: "Aucun prestataire n'est encore confirmé pour cette combinaison. Nous avons noté votre intérêt et vous contacterons par email dès qu'un prestataire sera disponible.",
    error: "Une erreur est survenue. Réessayez dans un instant.",
  },
  de: {
    title1: "Welche Art von Aktivität?",
    title2: "Welche Region?",
    onRequest: "auf Anfrage",
    title3: "Wann und wie viele?",
    dateLabel: "Datum",
    timeslotLabel: "Tageszeit",
    ts_morning: "Morgen",
    ts_afternoon: "Nachmittag",
    ts_evening: "Abend",
    ts_flexible: "Flexibel",
    adultsLabel: "Erwachsene",
    childrenLabel: "Kinder",
    title4: "Ihre Kontaktdaten",
    nameLabel: "Name",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon / WhatsApp (optional)",
    languageLabel: "Führungssprache",
    noteLabel: "Noch etwas? (optional)",
    noteHint: "Ernährung, Mobilität, Erfahrungslevel — keine persönlichen Kontaktdaten hier.",
    rgpd: "Ihre Daten werden an den lokalen Anbieter übermittelt, damit er Ihnen ein Angebot senden kann. Sonst nichts.",
    back: "Zurück",
    next: "Weiter",
    submit: "Anfrage senden",
    sending: "Wird gesendet…",
    sentTitle: "Anfrage gesendet",
    sentBody: "Ihre Anfrage wurde gesendet. Der lokale Anbieter wird sich in Kürze per E-Mail bei Ihnen melden.",
    noProviderTitle: "Wir suchen einen Anbieter",
    noProviderBody: "Für diese Kombination ist noch kein Anbieter bestätigt. Wir haben Ihr Interesse vermerkt und informieren Sie per E-Mail, sobald ein Anbieter verfügbar ist.",
    error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es gleich noch einmal.",
  },
  el: {
    title1: "Τι είδος δραστηριότητας;",
    title2: "Ποια περιοχή;",
    onRequest: "κατόπιν αιτήματος",
    title3: "Πότε και πόσοι;",
    dateLabel: "Ημερομηνία",
    timeslotLabel: "Ώρα ημέρας",
    ts_morning: "Πρωί",
    ts_afternoon: "Απόγευμα",
    ts_evening: "Βράδυ",
    ts_flexible: "Ευέλικτο",
    adultsLabel: "Ενήλικες",
    childrenLabel: "Παιδιά",
    title4: "Τα στοιχεία σας",
    nameLabel: "Όνομα",
    emailLabel: "Email",
    phoneLabel: "Τηλέφωνο / WhatsApp (προαιρετικό)",
    languageLabel: "Γλώσσα ξεναγού",
    noteLabel: "Κάτι άλλο; (προαιρετικό)",
    noteHint: "Διατροφή, κινητικότητα, επίπεδο εμπειρίας — όχι προσωπικά στοιχεία επικοινωνίας εδώ.",
    rgpd: "Τα στοιχεία σας αποστέλλονται στον τοπικό πάροχο για να σας απαντήσει με προσφορά. Τίποτα άλλο.",
    back: "Πίσω",
    next: "Συνέχεια",
    submit: "Αποστολή αιτήματος",
    sending: "Αποστολή…",
    sentTitle: "Το αίτημα στάλθηκε",
    sentBody: "Το αίτημά σας στάλθηκε. Ο τοπικός πάροχος θα σας απαντήσει σύντομα μέσω email.",
    noProviderTitle: "Αναζητούμε πάροχο",
    noProviderBody: "Δεν υπάρχει ακόμη επιβεβαιωμένος πάροχος για αυτόν τον συνδυασμό. Σημειώσαμε το ενδιαφέρον σας και θα σας ενημερώσουμε μέσω email μόλις υπάρξει διαθέσιμος πάροχος.",
    error: "Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.",
  },
};

// Icône par catégorie
function CategoryIcon({ slug, ...props }: { slug: string } & React.SVGProps<SVGSVGElement>) {
  if (slug === "food-tours") return <CiFood {...props} />;
  if (slug === "hiking") return <CiHike {...props} />;
  return <CiFerry {...props} />;
}

type View = "steps" | "sent" | "noProvider" | "error";

const INPUT_CLS =
  "w-full rounded-xl border-[1.5px] border-border bg-white px-3.5 py-2.5 text-[15px] text-text focus:outline-none focus:border-sea transition-colors";
const LABEL_CLS = "block text-[12px] font-semibold text-text-muted mb-1";

export type ActivityWizardProps = {
  locale: string;
  initialCategory?: string;
  initialCity?: string;
  servedCombos: Array<{ category_slug: string; city: string }>;
};

export function ActivityWizard({
  locale,
  initialCategory,
  initialCity,
  servedCombos,
}: ActivityWizardProps) {
  const t = T[locale] ?? T.en;
  const pathname = usePathname();

  // Double skip : valider les slugs avant d'accepter un skip d'étape
  const validCategory =
    initialCategory && isCategorySlug(initialCategory) ? (initialCategory as ActivityCategorySlug) : undefined;
  const validCity =
    validCategory && initialCity && isCitySlug(initialCity) ? (initialCity as ActivityCitySlug) : undefined;

  const [category, setCategory] = useState<ActivityCategorySlug | undefined>(validCategory);
  const [city, setCity] = useState<ActivityCitySlug | undefined>(validCity);
  const [step, setStep] = useState(validCity ? 3 : validCategory ? 2 : 1);

  const [date, setDate] = useState("");
  const [timeslot, setTimeslot] = useState<ActivityTimeslot | undefined>(undefined);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Langue de guide : locale si elle figure dans GUIDE_LANGUAGES, sinon "en"
  const defaultLang: GuideLanguage = (GUIDE_LANGUAGES as readonly string[]).includes(locale)
    ? (locale as GuideLanguage)
    : "en";
  const [language, setLanguage] = useState<GuideLanguage>(defaultLang);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [view, setView] = useState<View>("steps");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // Date min = aujourd'hui (défaut au mount pour éviter mismatch SSR)
  const [today, setToday] = useState("");
  useEffect(() => {
    const t = isoLocal(new Date());
    setToday(t);
    setDate((d) => d || t);
  }, []);

  // Scroll top au changement d'étape ou d'écran (pas au premier rendu)
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [step, view]);

  // Combo couvert ?
  const comboServed = (cat: string | undefined, cit: string | undefined) =>
    !!cat && !!cit && servedCombos.some((c) => c.category_slug === cat && c.city === cit);

  const contactValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());
  const step3Valid = !!date && date >= today && !!timeslot;

  async function submit() {
    if (!category || !city || !contactValid || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/activities/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          city,
          date,
          timeslot,
          adults,
          children,
          language,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
          locale,
          source: pathname,
          website,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 400 && json?.error) {
        // noProvider : le serveur a déjà envoyé l'ack
        setView("noProvider");
      } else if (res.ok && json?.ok === true) {
        window.plausible?.("Activity Lead", {
          props: { category, city, locale },
        });
        setView("sent");
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Écrans finaux ----------------------------------------------------------

  if (view === "sent") {
    return (
      <div ref={rootRef} data-testid="act-wizard-sent" className="card-base p-7 sm:p-10 text-center scroll-mt-24">
        <CiMark className="w-12 h-12 text-lagoon-deep mx-auto" />
        <h2 className="mt-4 font-heading font-extrabold text-2xl text-text">{t.sentTitle}</h2>
        <p className="mt-2 text-[15px] text-text-muted max-w-xl mx-auto">{t.sentBody}</p>
      </div>
    );
  }

  if (view === "noProvider") {
    return (
      <div ref={rootRef} data-testid="act-wizard-no-provider" className="card-base p-7 sm:p-10 text-center scroll-mt-24">
        <CiCompass className="w-12 h-12 text-sea mx-auto" />
        <h2 className="mt-4 font-heading font-extrabold text-2xl text-text">{t.noProviderTitle}</h2>
        <p className="mt-2 text-[15px] text-text-muted max-w-xl mx-auto">{t.noProviderBody}</p>
      </div>
    );
  }

  // ---- Étapes -----------------------------------------------------------------

  return (
    <div ref={rootRef} className="card-base p-5 sm:p-7 scroll-mt-24">
      {/* Barre de progression : 4 segments */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-sun" : "bg-border"}`}
            />
          ))}
        </div>
        <span className="font-data text-xs font-semibold text-text-muted">{step}/4</span>
      </div>

      {/* Étape 1 : catégorie */}
      {step === 1 && (
        <div data-testid="act-step-1">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title1}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ACTIVITY_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                data-testid={`act-category-${cat.slug}`}
                onClick={() => {
                  setCategory(cat.slug);
                  setStep(2);
                }}
                className={`flex items-center gap-2.5 rounded-2xl border-[1.5px] bg-white p-3.5 text-left transition-colors ${
                  category === cat.slug ? "border-sea bg-sea-faint" : "border-border hover:border-sea/50"
                }`}
              >
                <CategoryIcon slug={cat.slug} className="w-5 h-5 text-sea shrink-0" />
                <span className="font-heading font-bold text-[14px] leading-tight text-text">
                  {categoryLabel(cat.slug, locale)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Étape 2 : ville */}
      {step === 2 && (
        <div data-testid="act-step-2">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title2}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACTIVITY_CITIES.map((c) => {
              const covered = comboServed(category, c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  data-testid={`act-city-${c.slug}`}
                  onClick={() => {
                    setCity(c.slug);
                    setStep(3);
                  }}
                  className={`flex items-center justify-between gap-2.5 rounded-2xl border-[1.5px] p-3.5 text-left transition-colors ${
                    city === c.slug
                      ? "border-sea bg-sea-faint"
                      : covered
                      ? "bg-white border-border hover:border-sea/50"
                      : "bg-surface border-border hover:border-sea/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CiCompass
                      className={`w-5 h-5 shrink-0 ${covered ? "text-sea" : "text-text-muted/50"}`}
                    />
                    <span
                      className={`font-heading font-bold text-[14px] leading-tight ${
                        covered ? "text-text" : "text-text-muted"
                      }`}
                    >
                      {cityLabel(c.slug, locale)}
                    </span>
                  </div>
                  {!covered && (
                    <span className="text-[10px] uppercase tracking-wide font-bold text-text-muted/60 bg-border/50 rounded-full px-2 py-0.5 shrink-0">
                      {t.onRequest}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Étape 3 : date + créneau + participants */}
      {step === 3 && (
        <div data-testid="act-step-3">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title3}</h2>

          {/* Date */}
          <div className="mb-5">
            <label htmlFor="act-date" className={LABEL_CLS}>{t.dateLabel}</label>
            <input
              id="act-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${INPUT_CLS} font-data max-w-xs`}
            />
          </div>

          {/* Créneaux */}
          <div className="mb-5">
            <p className="font-heading font-bold text-[15px] text-text mb-2.5">{t.timeslotLabel}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ACTIVITY_TIMESLOTS.map((ts) => {
                const label =
                  ts === "morning" ? t.ts_morning
                  : ts === "afternoon" ? t.ts_afternoon
                  : ts === "evening" ? t.ts_evening
                  : t.ts_flexible;
                return (
                  <button
                    key={ts}
                    type="button"
                    data-testid={`act-timeslot-${ts}`}
                    onClick={() => setTimeslot(ts)}
                    className={`rounded-2xl border-[1.5px] bg-white p-3 text-center transition-colors ${
                      timeslot === ts ? "border-sea bg-sea-faint" : "border-border hover:border-sea/50"
                    }`}
                  >
                    <span className="font-heading font-bold text-[14px] text-text">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Steppers adultes + enfants */}
          <div className="space-y-3.5">
            {/* Adultes */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3.5">
              <span className="font-heading font-bold text-[15px] text-text">{t.adultsLabel}</span>
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setAdults((n) => Math.max(1, n - 1))}
                  disabled={adults <= 1}
                  className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
                >
                  −
                </button>
                <span data-testid="act-adults" className="font-data text-xl font-bold text-text w-7 text-center">
                  {adults}
                </span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setAdults((n) => Math.min(20, n + 1))}
                  disabled={adults >= 20}
                  className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            {/* Enfants */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3.5">
              <span className="font-heading font-bold text-[15px] text-text">{t.childrenLabel}</span>
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setChildren((n) => Math.max(0, n - 1))}
                  disabled={children <= 0}
                  className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
                >
                  −
                </button>
                <span data-testid="act-children" className="font-data text-xl font-bold text-text w-7 text-center">
                  {children}
                </span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setChildren((n) => Math.min(20, n + 1))}
                  disabled={children >= 20}
                  className="w-10 h-10 rounded-full border-[1.5px] border-border bg-white text-xl font-bold text-text hover:border-sea disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Étape 4 : contact + préférences */}
      {step === 4 && (
        <div data-testid="act-step-4">
          <h2 className="font-heading font-extrabold text-xl text-text mb-5">{t.title4}</h2>
          <div className="space-y-3 max-w-md">
            <div>
              <label htmlFor="act-name" className={LABEL_CLS}>{t.nameLabel}</label>
              <input
                id="act-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="act-email" className={LABEL_CLS}>{t.emailLabel}</label>
              <input
                id="act-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="act-phone" className={LABEL_CLS}>{t.phoneLabel}</label>
              <input
                id="act-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${INPUT_CLS} font-data`}
              />
            </div>
            <div>
              <label htmlFor="act-language" className={LABEL_CLS}>{t.languageLabel}</label>
              <select
                id="act-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as GuideLanguage)}
                className={INPUT_CLS}
              >
                {GUIDE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "en" ? "English"
                      : lang === "fr" ? "Français"
                      : lang === "de" ? "Deutsch"
                      : lang === "el" ? "Ελληνικά"
                      : lang === "it" ? "Italiano"
                      : lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="act-note" className={LABEL_CLS}>{t.noteLabel}</label>
              <textarea
                id="act-note"
                rows={3}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                className={INPUT_CLS}
              />
              <p className="mt-1 text-[11px] text-text-muted/70 leading-relaxed">{t.noteHint}</p>
            </div>
            {/* Honeypot : invisible pour les humains, irrésistible pour les bots */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <p className="text-xs text-text-muted leading-relaxed m-0 pt-1">{t.rgpd}</p>
            {submitError && (
              <p className="text-sm font-semibold text-terracotta m-0">{t.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation back / next */}
      {step > 1 && (
        <div className="mt-7 flex items-center justify-between gap-4">
          <button
            type="button"
            data-testid="act-back"
            onClick={() => setStep(step - 1)}
            className="text-sm font-bold text-text-muted hover:text-text transition-colors"
          >
            ← {t.back}
          </button>
          {step < 4 ? (
            <button
              type="button"
              data-testid="act-next"
              onClick={() => setStep(step + 1)}
              disabled={step === 3 ? !step3Valid : false}
              className="bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition-all"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="button"
              data-testid="act-submit"
              onClick={submit}
              disabled={!contactValid || submitting}
              className="bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition-all"
            >
              {submitting ? t.sending : t.submit}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
