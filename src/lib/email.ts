import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";

// ── Habillage commun Kalimera (même DA que le site, spec 2026-06-11) ───────
const C = {
  night: "#07374A", lagoon: "#00C2D4", lagoonDeep: "#008C9E", sun: "#FFC83D",
  terra: "#ED7A5C", aegean: "#0B5E78", text: "#0B3954", muted: "#5C7886",
  faint: "#94A3B8", border: "#DCE9EE", surface: "#F6FBFC",
};

// Baloo 2 n'est pas chargeable de façon fiable en email : fallback arrondi système.
const EMAIL_FONT = "'Baloo 2', 'Trebuchet MS', system-ui, -apple-system, sans-serif";

// Coquille commune : bandeau nuit + wordmark point soleil, carte blanche, pied
// avec lien site et réseaux sociaux. Tout en styles inline (Gmail/Outlook).
function kalimeraShell(inner: string): string {
  return `
  <div style="background:${C.surface}; padding:28px 12px; font-family:${EMAIL_FONT};">
    <div style="max-width:480px; margin:0 auto;">
      <div style="background:${C.night}; border-radius:24px 24px 0 0; padding:22px 20px 18px; text-align:center;">
        <p style="margin:0 0 4px; color:${C.lagoon}; font-size:13px; font-weight:700; letter-spacing:.08em;">Καλημέρα</p>
        <p style="margin:0; font-size:26px; font-weight:800; letter-spacing:.02em;"><span style="color:#ffffff;">crete</span> <span style="color:${C.sun};">·</span> <span style="color:#ffffff;">direct</span></p>
      </div>
      <div style="background:#ffffff; border:1px solid ${C.border}; border-top:0; border-radius:0 0 24px 24px; padding:28px 24px;">
        ${inner}
      </div>
      <p style="margin:16px 0 0; text-align:center; color:${C.faint}; font-size:12px;">
        <a href="https://crete.direct" style="color:${C.lagoonDeep}; font-weight:700; text-decoration:none;">crete.direct</a>
        &nbsp;·&nbsp;<a href="https://instagram.com/cretedirect" style="color:${C.faint}; text-decoration:none;">Instagram</a>
        &nbsp;·&nbsp;<a href="https://youtube.com/@CreteDirect" style="color:${C.faint}; text-decoration:none;">YouTube</a>
      </p>
    </div>
  </div>`;
}

function pillButton(href: string, label: string, bg: string): string {
  return `<a href="${href}" style="display:inline-block; background:${bg}; color:#ffffff; padding:13px 30px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px;">${label}</a>`;
}

const CONFIRM_SUBJECTS: Record<string, string> = {
  en: "Confirm your subscription to Crete Direct",
  fr: "Confirmez votre inscription à Crete Direct",
  de: "Bestätigen Sie Ihr Abonnement bei Crete Direct",
  el: "Επιβεβαιώστε την εγγραφή σας στο Crete Direct",
};

const CONFIRM_COPY: Record<string, { title: string; body: string; cta: string; ignore: string }> = {
  en: {
    title: "Almost there!",
    body: "Click the button below to confirm your subscription to the weekly Crete briefing.",
    cta: "Confirm my subscription",
    ignore: "If you didn't sign up, just ignore this email.",
  },
  fr: {
    title: "Presque terminé !",
    body: "Cliquez sur le bouton ci-dessous pour confirmer votre inscription au briefing hebdo Crète.",
    cta: "Confirmer mon inscription",
    ignore: "Si vous ne vous êtes pas inscrit, ignorez simplement cet email.",
  },
  de: {
    title: "Fast geschafft!",
    body: "Klicken Sie auf den Button unten, um Ihr Abonnement des wöchentlichen Kreta-Briefings zu bestätigen.",
    cta: "Abonnement bestätigen",
    ignore: "Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach.",
  },
  el: {
    title: "Σχεδόν έτοιμο!",
    body: "Κάντε κλικ στο παρακάτω κουμπί για να επιβεβαιώσετε την εγγραφή σας στο εβδομαδιαίο ενημερωτικό δελτίο Κρήτης.",
    cta: "Επιβεβαίωση εγγραφής",
    ignore: "Αν δεν εγγραφήκατε, αγνοήστε αυτό το email.",
  },
};

function confirmBody(url: string, lang: string): string {
  const c = CONFIRM_COPY[lang] || CONFIRM_COPY.en;
  return kalimeraShell(`
      <h2 style="margin:0 0 12px; color:${C.text}; font-size:20px;">${c.title}</h2>
      <p style="margin:0 0 24px; color:${C.muted}; line-height:1.6;">${c.body}</p>
      <div style="text-align:center; margin-bottom:24px;">${pillButton(url, c.cta, C.terra)}</div>
      <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center;">${c.ignore}</p>
  `);
}


export async function sendConfirmationEmail(email: string, token: string, locale: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
  const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${token}`;
  const lang = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: CONFIRM_SUBJECTS[lang] || CONFIRM_SUBJECTS.en,
    html: confirmBody(confirmUrl, lang),
  });
}

const WELCOME_SUBJECTS: Record<string, string> = {
  en: "Welcome to Crete Direct - Your weekly briefing starts Monday",
  fr: "Bienvenue sur Crete Direct - Votre briefing hebdo commence lundi",
  de: "Willkommen bei Crete Direct - Ihr wöchentliches Briefing startet Montag",
  el: "Καλώς ήρθατε στο Crete Direct - Το εβδομαδιαίο δελτίο ξεκινά Δευτέρα",
};

const WELCOME_COPY: Record<string, {
  title: string; intro: string; items: string[]; meanwhile: string;
  beaches: string; weather: string; tagline: string;
}> = {
  en: {
    title: "You're in!",
    intro: "Every Monday, you'll receive:",
    items: ["This week's weather forecast for 10 cities", "Upcoming events and festivals", "One hand-picked article about Crete"],
    meanwhile: "In the meantime, explore:",
    beaches: "500+ Beaches", weather: "Live Weather",
    tagline: "Free. Independent. Updated hourly.",
  },
  fr: {
    title: "C'est fait !",
    intro: "Chaque lundi, vous recevrez :",
    items: ["Les prévisions météo pour 10 villes", "Les événements et festivals à venir", "Un article sélectionné sur la Crète"],
    meanwhile: "En attendant, explorez :",
    beaches: "500+ Plages", weather: "Météo Live",
    tagline: "Gratuit. Indépendant. Mis à jour chaque heure.",
  },
  de: {
    title: "Sie sind dabei!",
    intro: "Jeden Montag erhalten Sie:",
    items: ["Wettervorhersage für 10 Städte", "Kommende Events und Festivals", "Einen ausgewählten Artikel über Kreta"],
    meanwhile: "Bis dahin entdecken Sie:",
    beaches: "500+ Strände", weather: "Live Wetter",
    tagline: "Kostenlos. Unabhängig. Stündlich aktualisiert.",
  },
  el: {
    title: "Είστε μέσα!",
    intro: "Κάθε Δευτέρα θα λαμβάνετε:",
    items: ["Πρόγνωση καιρού για 10 πόλεις", "Επερχόμενες εκδηλώσεις και φεστιβάλ", "Ένα επιλεγμένο άρθρο για την Κρήτη"],
    meanwhile: "Στο μεταξύ, εξερευνήστε:",
    beaches: "500+ Παραλίες", weather: "Live Καιρός",
    tagline: "Δωρεάν. Ανεξάρτητο. Ανανέωση κάθε ώρα.",
  },
};

function welcomeBody(lang: string): string {
  const c = WELCOME_COPY[lang] || WELCOME_COPY.en;
  return kalimeraShell(`
      <h2 style="margin:0 0 12px; color:${C.text}; font-size:20px;">${c.title}</h2>
      <p style="margin:0 0 4px; color:${C.muted}; line-height:1.6;">${c.intro}</p>
      <ul style="margin:0 0 16px; color:${C.muted}; line-height:1.8; padding-left:20px;">
        ${c.items.map((i) => `<li>${i}</li>`).join("")}
      </ul>
      <p style="margin:0 0 12px; color:${C.muted}; line-height:1.6;">${c.meanwhile}</p>
      <div style="margin:0 0 24px;">
        ${pillButton(`https://crete.direct/${lang}/beaches`, c.beaches, C.aegean)}
        &nbsp;${pillButton(`https://crete.direct/${lang}/weather`, c.weather, C.terra)}
      </div>
      <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center;">${c.tagline}</p>
  `);
}


export async function sendWelcomeEmail(email: string, locale: string) {
  const lang = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: WELCOME_SUBJECTS[lang] || WELCOME_SUBJECTS.en,
    html: welcomeBody(lang),
  });
}

// =============================================================================
// Car rental lead → partner agency (wizard /car-rental)
// =============================================================================

export interface CarLead {
  pickupLabel: string; dateFrom: string; timeFrom?: string; dateTo: string; timeTo?: string;
  flightNo?: string; carTypeLabel: string; pax?: number;
  customerName: string; customerEmail: string; customerPhone?: string; note?: string;
}

// Mode relais (par défaut tant que l'agence n'est pas prévenue du flux
// automatique) : le lead arrive UNIQUEMENT chez Kami, avec un lien WhatsApp
// prérempli pour le transférer à l'agence en un clic. Bascule en envoi
// direct : leadRouting "direct" sur le partenaire (car-partners.ts).
const RELAY_EMAIL = "contact@kairosguest.com";

function leadSummary(lead: CarLead): string[] {
  return [
    `Pickup / drop-off: ${lead.pickupLabel}`,
    `Arrival: ${lead.dateFrom}${lead.timeFrom ? ` at ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""}`,
    `Departure: ${lead.dateTo}${lead.timeTo ? ` at ${lead.timeTo}` : ""}`,
    `Car type: ${lead.carTypeLabel}`,
    `People: ${lead.pax ?? "-"}`,
    ``,
    `Customer: ${lead.customerName}`,
    `Email: ${lead.customerEmail}`,
    `Phone / WhatsApp: ${lead.customerPhone ?? "-"}`,
    lead.note ? `Note: ${lead.note}` : ``,
  ];
}

export interface CarLeadPartner {
  email: string;
  name: string;
  phone: string;
  whatsapp?: string;
  leadRouting?: "relay" | "direct";
}

export async function sendCarLeadEmail(partner: CarLeadPartner, lead: CarLead) {
  const subject = `New rental request — ${lead.pickupLabel} ${lead.dateFrom} → ${lead.dateTo} (${lead.carTypeLabel}${lead.pax ? `, ${lead.pax} pax` : ""})`;
  const relay = partner.leadRouting !== "direct";

  let to: string;
  let cc: string | undefined;
  let lines: string[];
  if (relay) {
    // Message WhatsApp prêt à transférer, calé sur les champs convenus avec
    // l'agence (arrival/departure time, car type, pax, dates).
    const wa = [
      `Hi ${partner.name.split(" ")[0]}, new rental request:`,
      `${lead.pickupLabel}, ${lead.dateFrom}${lead.timeFrom ? ` ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""} to ${lead.dateTo}${lead.timeTo ? ` ${lead.timeTo}` : ""}`,
      `${lead.carTypeLabel}, ${lead.pax ?? "?"} people`,
      `Guest: ${lead.customerName}, ${lead.customerPhone ?? lead.customerEmail}`,
    ].join("\n");
    const waNumber = (partner.whatsapp ?? partner.phone).replace(/\D/g, "");
    to = RELAY_EMAIL;
    cc = undefined;
    lines = [
      `Lead voiture à transmettre à ${partner.name}.`,
      ``,
      ...leadSummary(lead),
      ``,
      `>>> Transférer en 1 clic (WhatsApp prérempli) :`,
      `https://wa.me/${waNumber}?text=${encodeURIComponent(wa)}`,
      ``,
      `Répondre au client : reply direct à cet email (reply-to = client).`,
    ];
  } else {
    to = partner.email;
    cc = RELAY_EMAIL; // preuve horodatée de l'apport (10%)
    lines = [
      `Hi ${partner.name.split(" ")[0]},`,
      ``,
      `New rental request via crete.direct (Kami's referral partnership, 10%):`,
      ``,
      ...leadSummary(lead),
      ``,
      `Please reply directly to the customer (reply-to is set).`,
    ];
  }

  // Le SDK Resend ne throw pas sur erreur API ({ data, error }) : on propage
  // explicitement pour que la route marque la row email_failed + fallback WhatsApp.
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    ...(cc ? { cc } : {}),
    replyTo: lead.customerEmail,
    subject: relay ? `[Lead voiture — à transmettre] ${subject}` : subject,
    text: lines.join("\n"),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// ── Sélection Match Swipe (« Le Tinder de la Crète ») ──────────────────────

export interface SelectionPlace {
  name: string;
  typeLabel: string;
  exploreUrl: string;
  mapsUrl: string | null;
  photoUrl: string | null;
}

const SELECTION_SUBJECTS: Record<string, string> = {
  en: "Your Crete spots selection",
  fr: "Ta sélection de spots en Crète",
  de: "Deine Auswahl an Orten auf Kreta",
  el: "Η επιλογή σου από μέρη στην Κρήτη",
};

const SELECTION_COPY: Record<string, { title: string; intro: string; sheet: string; route: string }> = {
  en: {
    title: "Your spots",
    intro: "Everything you liked on the Tinder of Crete. Sheet to learn more, Route to drive there.",
    sheet: "Sheet", route: "Route",
  },
  fr: {
    title: "Tes spots",
    intro: "Tout ce que tu as liké sur le Tinder de la Crète. Fiche pour en savoir plus, Itinéraire pour y aller.",
    sheet: "Fiche", route: "Itinéraire",
  },
  de: {
    title: "Deine Orte",
    intro: "Alles, was dir auf dem Tinder Kretas gefallen hat. Details zum Nachlesen, Route zum Hinfahren.",
    sheet: "Details", route: "Route",
  },
  el: {
    title: "Τα μέρη σου",
    intro: "Ό,τι σου άρεσε στο Tinder της Κρήτης. Λεπτομέρειες για να μάθεις, Διαδρομή για να πας.",
    sheet: "Λεπτομέρειες", route: "Διαδρομή",
  },
};

export async function sendSelectionEmail(email: string, locale: string, places: SelectionPlace[]) {
  const lang = SELECTION_SUBJECTS[locale] ? locale : "en";
  const c = SELECTION_COPY[lang];
  const rows = places
    .map(
      (p) => `
      <tr>
        <td style="padding:14px 0; border-bottom:1px solid ${C.border}; width:76px; vertical-align:top;">
          ${p.photoUrl
            ? `<img src="${p.photoUrl}" alt="" width="64" height="64" style="display:block; width:64px; height:64px; object-fit:cover; border-radius:16px;" />`
            : `<div style="width:64px; height:64px; border-radius:16px; background:${C.surface};"></div>`}
        </td>
        <td style="padding:14px 0 14px 14px; border-bottom:1px solid ${C.border}; vertical-align:top;">
          <p style="margin:0; font-weight:700; color:${C.text}; font-size:15px;">${p.name}</p>
          <p style="margin:2px 0 8px; color:${C.muted}; font-size:12.5px;">${p.typeLabel}</p>
          <a href="${p.exploreUrl}" style="display:inline-block; margin-right:6px; background:${C.surface}; color:${C.aegean}; padding:6px 14px; border-radius:999px; text-decoration:none; font-weight:700; font-size:12px;">${c.sheet}</a>
          ${p.mapsUrl ? `<a href="${p.mapsUrl}" style="display:inline-block; background:${C.terra}; color:#ffffff; padding:6px 14px; border-radius:999px; text-decoration:none; font-weight:700; font-size:12px;">${c.route}</a>` : ""}
        </td>
      </tr>`,
    )
    .join("");
  const html = kalimeraShell(`
      <h2 style="margin:0 0 8px; color:${C.text}; font-size:20px;">${c.title} <span style="color:${C.lagoonDeep};">${places.length}</span></h2>
      <p style="margin:0 0 8px; color:${C.muted}; line-height:1.6;">${c.intro}</p>
      <table style="width:100%; border-collapse:collapse;">${rows}</table>
  `);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: SELECTION_SUBJECTS[lang],
    html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// =============================================================================
// Community reviews — magic-link confirmation + e-mail-based deletion
// =============================================================================

type ReviewMailLocale = "en" | "fr" | "de" | "el";

const REVIEW_SUBJECT: Record<ReviewMailLocale, string> = {
  en: "Confirm your review on crete.direct",
  fr: "Confirme ton avis sur crete.direct",
  de: "Bestätige deine Bewertung auf crete.direct",
  el: "Επιβεβαίωσε την κριτική σου στο crete.direct",
};

const REVIEW_BODY: Record<ReviewMailLocale, (placeName: string, confirmUrl: string, deleteUrl: string) => string> = {
  en: (p, c, d) => `Hi,\n\nThanks for reviewing ${p} on crete.direct.\n\nConfirm your review (one click):\n${c}\n\nChanged your mind? Delete it:\n${d}\n\n— crete.direct`,
  fr: (p, c, d) => `Bonjour,\n\nMerci pour ton avis sur ${p} sur crete.direct.\n\nConfirme ton avis (un clic) :\n${c}\n\nTu as changé d'avis ? Supprime-le :\n${d}\n\n— crete.direct`,
  de: (p, c, d) => `Hallo,\n\nDanke für deine Bewertung von ${p} auf crete.direct.\n\nBewertung bestätigen (ein Klick):\n${c}\n\nMeinung geändert? Löschen:\n${d}\n\n— crete.direct`,
  el: (p, c, d) => `Γεια,\n\nΕυχαριστούμε για την κριτική σου για το ${p} στο crete.direct.\n\nΕπιβεβαίωσε (ένα κλικ):\n${c}\n\nΆλλαξες γνώμη; Διαγραφή:\n${d}\n\n— crete.direct`,
};

export async function sendReviewConfirmationEmail(opts: {
  email: string;
  confirmToken: string;
  deleteToken: string;
  locale: string;
  placeName: string;
}): Promise<void> {
  const l = (["en", "fr", "de", "el"].includes(opts.locale) ? opts.locale : "en") as ReviewMailLocale;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crete.direct";
  const confirmUrl = `${base}/api/reviews/confirm?token=${encodeURIComponent(opts.confirmToken)}`;
  const deleteUrl  = `${base}/api/reviews/delete?token=${encodeURIComponent(opts.deleteToken)}`;
  await resend.emails.send({
    from: `crete.direct <${process.env.RESEND_FROM ?? "noreply@crete.direct"}>`,
    to: opts.email,
    subject: REVIEW_SUBJECT[l],
    text: REVIEW_BODY[l](opts.placeName, confirmUrl, deleteUrl),
  });
}

// =============================================================================
// Lead /projet (institutions / sponsors) -> Kami
// =============================================================================
import type { ProjetLead } from "./projet-lead";

const PROJET_LEAD_TO = "contact@kairosguest.com";
const PROJET_LEAD_CC = "hello@crete.direct";

export async function sendProjetLeadEmail(lead: ProjetLead) {
  const who = lead.kind === "institution" ? (lead.org ?? lead.name) : (lead.company ?? lead.name);
  const subject = `[/projet] ${lead.kind} · ${who}`;
  const lines = [
    `Nouveau lead /projet (${lead.kind}).`,
    ``,
    `Nom: ${lead.name}`,
    lead.org ? `Organisme: ${lead.org}` : ``,
    lead.role ? `Fonction: ${lead.role}` : ``,
    lead.company ? `Entreprise: ${lead.company}` : ``,
    lead.website ? `Site: ${lead.website}` : ``,
    `Email: ${lead.email}`,
    `Langue: ${lead.locale}`,
    ``,
    lead.message ? `Message:\n${lead.message}` : `(pas de message)`,
    ``,
    `Repondre au contact : reply direct (reply-to = ${lead.email}).`,
  ].filter((l) => l !== ``);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: PROJET_LEAD_TO,
    cc: PROJET_LEAD_CC,
    replyTo: lead.email,
    subject,
    text: lines.join("\n"),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}
