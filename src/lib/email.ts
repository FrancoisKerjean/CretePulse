import { Resend } from "resend";
import { buildCarWaMessage, waHref } from "./car-admin";
import { inclusionLabels } from "@/lib/car-inclusions";
import { sharedOfferCopy } from "@/lib/car-offer-copy";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";

// ── Habillage commun Kalimera (même DA que le site, spec 2026-06-11) ───────
const C = {
  night: "#07374A", lagoon: "#00C2D4", lagoonDeep: "#008C9E", sun: "#FFC83D",
  terracotta: "#ED7A5C", sea: "#0B5E78", text: "#0B3954", muted: "#5C7886",
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
      <div style="text-align:center; margin-bottom:24px;">${pillButton(url, c.cta, C.terracotta)}</div>
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
        ${pillButton(`https://crete.direct/${lang}/beaches`, c.beaches, C.sea)}
        &nbsp;${pillButton(`https://crete.direct/${lang}/weather`, c.weather, C.terracotta)}
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
// Affiliate signup → welcome email (self-serve close, no human reply needed)
// =============================================================================

export interface AffiliateWelcome {
  email: string;
  name: string;
  link: string;
  code: string;
  commissionPct: number;
}

export async function sendAffiliateWelcome(a: AffiliateWelcome): Promise<void> {
  const first = a.name.split(" ")[0] || a.name;
  const html = kalimeraShell(`
      <h2 style="margin:0 0 12px; color:${C.text}; font-size:20px;">You're live on crete.direct 🎉</h2>
      <p style="margin:0 0 16px; color:${C.muted}; line-height:1.6;">Hi ${first}, ${a.name} is now part of the crete.direct affiliate program. Here is your tracked link, it is already live:</p>
      <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:14px 16px; margin:0 0 18px; word-break:break-all; font-size:14px; color:${C.sea}; font-weight:700;">${a.link}</div>
      <p style="margin:0 0 6px; color:${C.text}; font-weight:700; font-size:15px;">The deal, in one line</p>
      <p style="margin:0 0 16px; color:${C.muted}; line-height:1.6;">You pay a flat <strong>${a.commissionPct}%</strong> commission only on the bookings we refer to you. No setup fee, no monthly cost, cancel anytime by replying to this email.</p>
      <p style="margin:0 0 6px; color:${C.text}; font-weight:700; font-size:15px;">What happens now</p>
      <ul style="margin:0 0 18px; color:${C.muted}; line-height:1.8; padding-left:20px;">
        <li>We feature ${a.name} across crete.direct, where travellers plan their trip.</li>
        <li>Every visitor we send you goes through your tracked link, so bookings are counted transparently.</li>
        <li>Your promo code <strong>${a.code}</strong> lets us reconcile bookings with you, no hidden numbers.</li>
      </ul>
      <div style="text-align:center; margin:0 0 18px;">${pillButton("https://crete.direct/explore", "See the map you're on", C.sea)}</div>
      <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center;">Questions? Just reply to this email, a real person reads it.</p>
  `);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: a.email,
    replyTo: "hello@crete.direct",
    subject: `You're live on crete.direct · your affiliate link is ready`,
    html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

// =============================================================================
// Car rental lead → partner agency (wizard /car-rental)
// =============================================================================

export interface CarLead {
  pickupLabel: string; dateFrom: string; timeFrom?: string; dateTo: string; timeTo?: string;
  flightNo?: string; carTypeLabel: string; pax?: number;
  insurance?: string; payment?: string; // 'full'|'basic' · 'cash'|'card'
  customerName: string; customerEmail: string; customerPhone?: string; note?: string;
}

const INSURANCE_LABEL: Record<string, string> = { full: "Full insurance (all-risk)", basic: "Basic insurance" };
const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", card: "Card" };

// Mode relais (par défaut tant que l'agence n'est pas prévenue du flux
// automatique) : le lead arrive UNIQUEMENT chez Kami, avec un lien WhatsApp
// prérempli pour le transférer à l'agence en un clic. Bascule en envoi
// direct : leadRouting "direct" sur le partenaire (car-partners.ts).
const RELAY_EMAIL = "contact@kairosguest.com";

// includeContact=false : version « aveugle » pour le loueur en mode appel
// d'offres. Il voit la demande (dates, lieu, type, pax, note) mais PAS les
// coordonnées du client : la mise en relation n'a lieu qu'après acceptation
// du devis. Kami reçoit toujours la version complète (includeContact=true).
function leadSummary(lead: CarLead, includeContact = true): string[] {
  return [
    `Pickup / drop-off: ${lead.pickupLabel}`,
    `Arrival: ${lead.dateFrom}${lead.timeFrom ? ` at ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""}`,
    `Departure: ${lead.dateTo}${lead.timeTo ? ` at ${lead.timeTo}` : ""}`,
    `Car type: ${lead.carTypeLabel}`,
    `People: ${lead.pax ?? "-"}`,
    ...(lead.insurance && INSURANCE_LABEL[lead.insurance] ? [`Insurance: ${INSURANCE_LABEL[lead.insurance]}`] : []),
    ...(lead.payment && PAYMENT_LABEL[lead.payment] ? [`Payment: ${PAYMENT_LABEL[lead.payment]}`] : []),
    ...(includeContact
      ? [``, `Customer: ${lead.customerName}`, `Email: ${lead.customerEmail}`, `Phone / WhatsApp: ${lead.customerPhone ?? "-"}`]
      : []),
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

export async function sendCarLeadEmail(partner: CarLeadPartner, lead: CarLead, quoteUrl?: string) {
  const subject = `New rental request · ${lead.pickupLabel} ${lead.dateFrom} → ${lead.dateTo} (${lead.carTypeLabel}${lead.pax ? `, ${lead.pax} pax` : ""})`;
  const relay = partner.leadRouting !== "direct";
  const first = partner.name.split(" ")[0];

  if (relay) {
    // Mode relais : le lead arrive chez Kami avec un message WhatsApp prérempli
    // (champs convenus avec l'agence) à transférer en un clic.
    const wa = buildCarWaMessage({
      partnerFirstName: first,
      pickupLabel: lead.pickupLabel,
      dateFrom: lead.dateFrom, timeFrom: lead.timeFrom, flightNo: lead.flightNo,
      dateTo: lead.dateTo, timeTo: lead.timeTo,
      carTypeLabel: lead.carTypeLabel, pax: lead.pax,
      customerName: lead.customerName,
      customerContact: lead.customerPhone ?? lead.customerEmail,
    });
    const lines = [
      `Lead voiture à transmettre à ${partner.name}.`,
      ``,
      ...leadSummary(lead, true),
      ``,
      `>>> Transférer en 1 clic (WhatsApp prérempli) :`,
      waHref(partner.whatsapp ?? partner.phone, wa),
      ``,
      `Répondre au client : reply direct à cet email (reply-to = client).`,
    ];
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: RELAY_EMAIL,
      replyTo: lead.customerEmail,
      subject: `[Lead voiture · à transmettre] ${subject}`,
      text: lines.join("\n"),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return data;
  }

  // Mode direct = appel d'offres. Le loueur reçoit la demande SANS les
  // coordonnées du client et répond son prix à Kami (reply-to = Kami). Kami
  // collecte les prix, les transmet au client ; la mise en relation n'a lieu
  // qu'après acceptation. Kami reçoit à part un email de suivi AVEC les
  // coordonnées client pour piloter la relance.
  const agencyLines = [
    `Hi ${first},`,
    ``,
    `A customer just requested a car through crete.direct. Here is the booking:`,
    ``,
    ...leadSummary(lead, false),
    ``,
    `Our referral commission on this rental is 10%.`,
    ``,
    ...(quoteUrl
      ? [
          `Send your price in one click (no login needed):`,
          quoteUrl,
          ``,
          `As soon as you submit it, the customer receives your quote automatically. I connect you both the moment they accept.`,
        ]
      : [
          `Please reply to this email with your price and let me know whether you accept the booking. I will share it with the customer and connect you both once they confirm.`,
        ]),
    ``,
    `Thanks,`,
    `Kami · crete.direct`,
  ];
  // L'email au loueur est le seul critique : on propage son erreur pour que la
  // route marque email_failed + fallback WhatsApp.
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: partner.email,
    replyTo: RELAY_EMAIL,
    subject,
    text: agencyLines.join("\n"),
  });
  if (error) throw new Error(`Resend: ${error.message}`);

  // Suivi interne à Kami AVEC coordonnées client (best-effort, n'interrompt pas
  // le flux si Resend échoue sur ce second envoi).
  try {
    const followUp = [
      `Lead voiture envoyé à ${partner.name} (${partner.email}), en attente de son prix.`,
      ``,
      ...leadSummary(lead, true),
      ``,
      `Prochaine étape : ${partner.name} répond son prix → transmettre au client → si OK, mise en relation.`,
    ];
    await resend.emails.send({
      from: FROM_EMAIL,
      to: RELAY_EMAIL,
      replyTo: lead.customerEmail,
      subject: `[Lead voiture · suivi] ${subject}`,
      text: followUp.join("\n"),
    });
  } catch (e) {
    console.error("[sendCarLeadEmail] suivi Kami échoué:", e);
  }

  return data;
}

/** Appel d'offres : email « aveugle » à UN loueur direct avec son lien de
 *  soumission de prix. Pas de copie Kami (synthèse unique via
 *  sendLeadKamiSummary). Propage l'erreur Resend (la route compte les envois). */
export async function sendAgencyQuoteRequest(partner: { name: string; email: string }, lead: CarLead, quoteUrl: string) {
  const first = partner.name.split(" ")[0];
  const subject = `New rental request · ${lead.pickupLabel} ${lead.dateFrom} → ${lead.dateTo} (${lead.carTypeLabel}${lead.pax ? `, ${lead.pax} pax` : ""})`;

  // Récap booking (aveugle : pas de coordonnées client à ce stade).
  const recapRows: Array<[string, string]> = [
    ["Pickup / drop-off", lead.pickupLabel],
    ["Arrival", `${lead.dateFrom}${lead.timeFrom ? ` at ${lead.timeFrom}` : ""}${lead.flightNo ? ` (flight ${lead.flightNo})` : ""}`],
    ["Departure", `${lead.dateTo}${lead.timeTo ? ` at ${lead.timeTo}` : ""}`],
    ["Car type", lead.carTypeLabel],
    ["People", `${lead.pax ?? "-"}`],
  ];
  const recap = recapRows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 8px; font-size:14px; line-height:1.5;"><strong style="color:${C.text};">${label}:</strong> <span style="color:${C.muted};">${value}</span></p>`,
    )
    .join("");

  const html = kalimeraShell(`
      <h2 style="margin:0 0 12px; color:${C.text}; font-size:20px;">New car rental request</h2>
      <p style="margin:0 0 18px; color:${C.muted}; line-height:1.6;">Hi ${first}, a customer just requested a car through crete.direct. Here is the booking:</p>
      <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:16px 18px; margin:0 0 18px;">
        ${recap}
      </div>
      <p style="margin:0 0 20px; color:${C.text}; font-weight:700; font-size:15px;">Our referral commission is 10%, only on confirmed bookings.</p>
      <div style="text-align:center; margin:0 0 16px;">${pillButton(quoteUrl, "Send your price", C.terracotta)}</div>
      <p style="margin:0 0 22px; color:${C.faint}; font-size:12px; line-height:1.6; text-align:center;">No login needed. The customer compares all offers and picks one. Send your best price.</p>
      <p style="margin:0; color:${C.text}; line-height:1.5;"><strong>Kami</strong><br><span style="color:${C.faint}; font-size:13px;">crete.direct</span></p>
  `);

  // Fallback texte brut (clients sans HTML).
  const lines = [
    `Hi ${first},`,
    ``,
    `A customer just requested a car through crete.direct. Here is the booking:`,
    ``,
    ...leadSummary(lead, false),
    ``,
    `Our referral commission is 10%, only on confirmed bookings.`,
    ``,
    `Send your price in one click, no login:`,
    quoteUrl,
    ``,
    `The customer compares all offers and picks one. Send your best price.`,
    ``,
    `Kami`,
    `crete.direct`,
  ];

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL, to: partner.email, replyTo: RELAY_EMAIL, subject, html, text: lines.join("\n"),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

/** Synthèse unique à Kami pour un lead diffusé en appel d'offres : coordonnées
 *  client complètes + loueurs invités. Best-effort. */
export async function sendLeadKamiSummary(lead: CarLead, partnerNames: string[]) {
  const subject = `New rental request · ${lead.pickupLabel} ${lead.dateFrom} → ${lead.dateTo} (${lead.carTypeLabel}${lead.pax ? `, ${lead.pax} pax` : ""})`;
  const lines = [
    `Lead voiture diffusé à ${partnerNames.length} loueur(s) : ${partnerNames.join(", ")}.`,
    ``,
    ...leadSummary(lead, true),
    ``,
    `Premier qui soumet son prix gagne. Le client reçoit l'offre automatiquement ; tu es en copie à l'acceptation.`,
  ];
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: RELAY_EMAIL, replyTo: lead.customerEmail,
      subject: `[Lead voiture · suivi] ${subject}`, text: lines.join("\n"),
    });
  } catch (e) { console.error("[sendLeadKamiSummary] échec:", e); }
}

// ── Devis voiture : prix au client + mise en relation ──────────────────────

export interface CarQuoteInfo {
  pickupLabel: string; dateFrom: string; dateTo: string; carTypeLabel: string;
  price: number; currency: string;
  partnerName: string;
  carModel?: string | null;
  inclusions?: string[];
  days: number;
}

const money = (price: number, currency: string): string =>
  currency === "EUR" ? `€${price}` : `${price} ${currency}`;

const QUOTE_SUBJECT: Record<string, string> = {
  en: "Your car rental quote for Crete",
  fr: "Votre devis de location de voiture en Crète",
  de: "Ihr Mietwagen-Angebot für Kreta",
  el: "Η προσφορά ενοικίασης αυτοκινήτου στην Κρήτη",
};

const QUOTE_COPY: Record<string, {
  intro: string; details: string; cta: string; foot: string;
}> = {
  en: {
    intro: "Good news, we received a price for your car rental request.", details: "Your request", cta: "Accept this offer", foot: "Accept and we connect you directly with the rental agency to finalise. Didn't request this? Just ignore this email.",
  },
  fr: {
    intro: "Bonne nouvelle, nous avons reçu un prix pour votre demande de location de voiture.", details: "Votre demande", cta: "Accepter cette offre", foot: "En acceptant, nous vous mettons directement en relation avec l'agence de location pour finaliser. Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email.",
  },
  de: {
    intro: "Gute Nachrichten, wir haben einen Preis für Ihre Mietwagenanfrage erhalten.", details: "Ihre Anfrage", cta: "Angebot annehmen", foot: "Nach der Annahme verbinden wir Sie direkt mit der Autovermietung. Keine Anfrage gestellt? Ignorieren Sie diese E-Mail.",
  },
  el: {
    intro: "Καλά νέα, λάβαμε μια τιμή για το αίτημα ενοικίασης αυτοκινήτου σας.", details: "Το αίτημά σας", cta: "Αποδοχή προσφοράς", foot: "Με την αποδοχή, σας συνδέουμε απευθείας με το γραφείο ενοικίασης. Δεν κάνατε εσείς το αίτημα; Αγνοήστε αυτό το email.",
  },
};

/** Email HTML au client avec le prix soumis par le loueur + bouton d'acceptation. */
export async function sendCustomerQuoteEmail(opts: {
  email: string; locale: string; customerName: string; acceptUrl: string; quote: CarQuoteInfo;
}) {
  const l = QUOTE_SUBJECT[opts.locale] ? opts.locale : "en";
  const c = { ...QUOTE_COPY[l], ...sharedOfferCopy(l) };
  const q = opts.quote;
  const perDay = q.days > 0 ? Math.round(q.price / q.days) : q.price;
  const incl = inclusionLabels(q.inclusions, l);
  const inner = `
  <p style="margin:0 0 6px; color:${C.text}; font-size:18px; font-weight:800;">${opts.customerName ? `${opts.customerName}, ` : ""}${money(q.price, q.currency)} <span style="font-weight:600; font-size:14px; color:${C.muted};">${c.total} · ~${money(perDay, q.currency)} ${c.perDay}</span></p>
  <p style="margin:0 0 6px; color:${C.text}; font-size:14px;">${c.offerFrom} <strong>${q.partnerName}</strong> · ${c.localAgency}</p>
  <p style="margin:0 0 18px; color:${C.muted}; font-size:14px; line-height:1.6;">${c.intro}</p>
  <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:14px 16px; margin:0 0 16px;">
    <p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.details}</p>
    <p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">
      ${q.pickupLabel}<br>${q.dateFrom} → ${q.dateTo}<br>${q.carTypeLabel}${q.carModel ? `<br><strong>${q.carModel}</strong>` : ""}
    </p>
  </div>
  ${incl.length ? `<div style="margin:0 0 16px;"><p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.included}</p><p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">${incl.map((x) => `✓ ${x}`).join("<br>")}</p></div>` : ""}
  <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:12px 16px; margin:0 0 18px;">
    ${c.reassure.map((r) => `<p style="margin:0 0 4px; color:${C.text}; font-size:13px;">• ${r}</p>`).join("")}
  </div>
  <div style="text-align:center; margin:0 0 14px;">${pillButton(opts.acceptUrl, c.cta, C.lagoonDeep)}</div>
  <p style="margin:0 0 4px; color:${C.faint}; font-size:12px; font-weight:700;">${c.details}:</p>
  <p style="margin:0 0 14px; color:${C.muted}; font-size:12px; line-height:1.7;">${c.steps.map((s, i) => `${i + 1}. ${s}`).join("<br>")}</p>
  <p style="margin:0; color:${C.faint}; font-size:12px; line-height:1.6;">${c.foot}</p>
`;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.email,
    replyTo: RELAY_EMAIL,
    subject: `${QUOTE_SUBJECT[l]} · ${money(q.price, q.currency)}`,
    html: kalimeraShell(inner),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// ── Accusé de réception immédiat au client (trou 3a) ────────────────────────

const ACK_SUBJECT: Record<string, string> = {
  en: "Your car rental request — Crete Direct",
  fr: "Votre demande de location — Crete Direct",
  de: "Ihre Mietwagenanfrage — Crete Direct",
  el: "Το αίτημα ενοικίασης αυτοκινήτου σας — Crete Direct",
};

const ACK_COPY: Record<string, {
  details: string; bodyOk: string; bodyNoAgency: string;
}> = {
  en: {
    details: "Your request",
    bodyOk: "We received your request and asked local rental agencies for a price. You'll get an offer shortly by email. If none reply, we'll let you know.",
    bodyNoAgency: "We received your request, but no partner agency is available for these criteria right now. We'll get back to you.",
  },
  fr: {
    details: "Votre demande",
    bodyOk: "Nous avons bien reçu votre demande et interrogé les agences de location locales. Vous recevrez une offre très vite par email. Si aucune ne répond, nous vous préviendrons.",
    bodyNoAgency: "Nous avons bien reçu votre demande, mais aucune agence partenaire n'est disponible pour ces critères pour le moment. Nous revenons vers vous.",
  },
  de: {
    details: "Ihre Anfrage",
    bodyOk: "Wir haben Ihre Anfrage erhalten und lokale Autovermietungen um ein Angebot gebeten. Sie erhalten bald ein Angebot per E-Mail. Falls keine antwortet, melden wir uns bei Ihnen.",
    bodyNoAgency: "Wir haben Ihre Anfrage erhalten, aber momentan ist keine Partneragentur für diese Kriterien verfügbar. Wir melden uns bei Ihnen.",
  },
  el: {
    details: "Το αίτημά σας",
    bodyOk: "Λάβαμε το αίτημά σας και ζητήσαμε τιμή από τοπικά γραφεία ενοικίασης. Σύντομα θα λάβετε μια προσφορά μέσω email. Αν κανένα δεν απαντήσει, θα σας ενημερώσουμε.",
    bodyNoAgency: "Λάβαμε το αίτημά σας, αλλά αυτή τη στιγμή δεν υπάρχει διαθέσιμη συνεργαζόμενη εταιρεία για αυτά τα κριτήρια. Θα επικοινωνήσουμε μαζί σας.",
  },
};

/** Accusé de réception envoyé immédiatement au client après soumission du formulaire.
 *  noAgency=true quand aucun loueur partenaire n'a pu être contacté. */
export async function sendCustomerRequestReceived(opts: {
  email: string; locale: string; customerName?: string;
  request: { pickupLabel: string; dateFrom: string; dateTo: string; carTypeLabel: string };
  noAgency: boolean;
}) {
  const l = ACK_SUBJECT[opts.locale] ? opts.locale : "en";
  const c = ACK_COPY[l];
  const r = opts.request;
  const inner = `
  <p style="margin:0 0 16px; color:${C.muted}; font-size:14px; line-height:1.6;">${opts.customerName ? `${opts.customerName}, ` : ""}${opts.noAgency ? c.bodyNoAgency : c.bodyOk}</p>
  <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:14px 16px; margin:0 0 16px;">
    <p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.details}</p>
    <p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">
      ${r.pickupLabel}<br>${r.dateFrom} → ${r.dateTo}<br>${r.carTypeLabel}
    </p>
  </div>
`;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.email,
    replyTo: RELAY_EMAIL,
    subject: ACK_SUBJECT[l],
    html: kalimeraShell(inner),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

const CONNECT_SUBJECT: Record<string, string> = {
  en: "You're connected with your car rental agency",
  fr: "Vous êtes en relation avec votre agence de location",
  de: "Sie sind mit Ihrer Autovermietung verbunden",
  el: "Συνδεθήκατε με το γραφείο ενοικίασης αυτοκινήτων",
};

const CONNECT_COPY: Record<string, { intro: string; agency: string; foot: string }> = {
  en: { intro: "You accepted the offer. Here are the rental agency's details, they will also reach out to finalise your booking.", agency: "Rental agency", foot: "Payment and terms are agreed directly with the agency." },
  fr: { intro: "Vous avez accepté l'offre. Voici les coordonnées de l'agence de location, elle vous contactera aussi pour finaliser votre réservation.", agency: "Agence de location", foot: "Le paiement et les conditions se règlent directement avec l'agence." },
  de: { intro: "Sie haben das Angebot angenommen. Hier sind die Kontaktdaten der Autovermietung, sie meldet sich ebenfalls bei Ihnen.", agency: "Autovermietung", foot: "Zahlung und Bedingungen werden direkt mit der Vermietung vereinbart." },
  el: { intro: "Αποδεχτήκατε την προσφορά. Ακολουθούν τα στοιχεία του γραφείου ενοικίασης, θα επικοινωνήσει και εκείνο μαζί σας.", agency: "Γραφείο ενοικίασης", foot: "Η πληρωμή και οι όροι συμφωνούνται απευθείας με το γραφείο." },
};

/** Après acceptation : met loueur et client en relation (coordonnées échangées).
 *  Loueur = email texte B2B (CC Kami, preuve) ; client = HTML localisé. */
export async function sendConnectionEmails(opts: {
  partner: { name: string; email: string; phone: string; whatsapp?: string };
  customer: { name: string; email: string; phone?: string; locale: string };
  quote: CarQuoteInfo;
}) {
  const { partner, customer, quote } = opts;
  const l = CONNECT_SUBJECT[customer.locale] ? customer.locale : "en";
  const c = CONNECT_COPY[l];

  // 1. Au loueur : coordonnées du client (la commande est confirmée côté client).
  const agencyLines = [
    `Hi ${partner.name.split(" ")[0]},`,
    ``,
    `Good news: the customer accepted your ${money(quote.price, quote.currency)} quote. Here are their details to finalise the rental:`,
    ``,
    `Customer: ${customer.name}`,
    `Email: ${customer.email}`,
    `Phone / WhatsApp: ${customer.phone ?? "-"}`,
    ``,
    `Booking: ${quote.pickupLabel}, ${quote.dateFrom} → ${quote.dateTo}, ${quote.carTypeLabel}`,
    `Our referral commission is 10%.`,
    ``,
    `Please contact the customer to confirm the details. Thanks!`,
    `Kami · crete.direct`,
  ];
  const r1 = await resend.emails.send({
    from: FROM_EMAIL,
    to: partner.email,
    cc: RELAY_EMAIL,
    replyTo: customer.email,
    subject: `Booking confirmed · ${quote.pickupLabel} ${quote.dateFrom} → ${quote.dateTo} (${money(quote.price, quote.currency)})`,
    text: agencyLines.join("\n"),
  });
  if (r1.error) throw new Error(`Resend: ${r1.error.message}`);

  // 2. Au client : coordonnées du loueur (HTML localisé).
  const inner = `
    <p style="margin:0 0 16px; color:${C.muted}; font-size:14px; line-height:1.6;">${customer.name ? `${customer.name}, ` : ""}${c.intro}</p>
    <div style="background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:14px 16px; margin:0 0 18px;">
      <p style="margin:0 0 6px; color:${C.faint}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;">${c.agency}</p>
      <p style="margin:0; color:${C.text}; font-size:14px; line-height:1.7;">
        ${partner.name}<br>${partner.whatsapp ?? partner.phone}<br>${partner.email}
      </p>
    </div>
    <p style="margin:0; color:${C.faint}; font-size:12px; line-height:1.6;">${c.foot}</p>
  `;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: customer.email,
    replyTo: RELAY_EMAIL,
    subject: CONNECT_SUBJECT[l],
    html: kalimeraShell(inner),
  });
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
          <a href="${p.exploreUrl}" style="display:inline-block; margin-right:6px; background:${C.surface}; color:${C.sea}; padding:6px 14px; border-radius:999px; text-decoration:none; font-weight:700; font-size:12px;">${c.sheet}</a>
          ${p.mapsUrl ? `<a href="${p.mapsUrl}" style="display:inline-block; background:${C.terracotta}; color:#ffffff; padding:6px 14px; border-radius:999px; text-decoration:none; font-weight:700; font-size:12px;">${c.route}</a>` : ""}
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
// Community reviews · magic-link confirmation + e-mail-based deletion
// =============================================================================

type ReviewMailLocale = "en" | "fr" | "de" | "el";

const REVIEW_SUBJECT: Record<ReviewMailLocale, string> = {
  en: "Confirm your review on crete.direct",
  fr: "Confirme ton avis sur crete.direct",
  de: "Bestätige deine Bewertung auf crete.direct",
  el: "Επιβεβαίωσε την κριτική σου στο crete.direct",
};

const REVIEW_BODY: Record<ReviewMailLocale, (placeName: string, confirmUrl: string, deleteUrl: string) => string> = {
  en: (p, c, d) => `Hi,\n\nThanks for reviewing ${p} on crete.direct.\n\nConfirm your review (one click):\n${c}\n\nChanged your mind? Delete it:\n${d}\n\n· crete.direct`,
  fr: (p, c, d) => `Bonjour,\n\nMerci pour ton avis sur ${p} sur crete.direct.\n\nConfirme ton avis (un clic) :\n${c}\n\nTu as changé d'avis ? Supprime-le :\n${d}\n\n· crete.direct`,
  de: (p, c, d) => `Hallo,\n\nDanke für deine Bewertung von ${p} auf crete.direct.\n\nBewertung bestätigen (ein Klick):\n${c}\n\nMeinung geändert? Löschen:\n${d}\n\n· crete.direct`,
  el: (p, c, d) => `Γεια,\n\nΕυχαριστούμε για την κριτική σου για το ${p} στο crete.direct.\n\nΕπιβεβαίωσε (ένα κλικ):\n${c}\n\nΆλλαξες γνώμη; Διαγραφή:\n${d}\n\n· crete.direct`,
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

// ── Cron silence >24h : aucune agence n'a encore soumis de prix ─────────────

const NO_QUOTE_SUBJECT: Record<string, string> = {
  en: "Update on your car rental request — Crete Direct",
  fr: "Point sur votre demande de location — Crete Direct",
  de: "Update zu Ihrer Mietwagenanfrage — Crete Direct",
  el: "Ενημέρωση για το αίτημα ενοικίασης αυτοκινήτου σας — Crete Direct",
};

const NO_QUOTE_BODY: Record<string, string> = {
  en: "No agency has sent a price yet for your car rental request. We're still on it — we'll email you as soon as we have an offer.",
  fr: "Aucune agence n'a encore envoyé de prix pour votre demande de location. Nous y travaillons toujours — nous vous écrirons dès que nous avons une offre.",
  de: "Noch keine Agentur hat einen Preis für Ihre Mietwagenanfrage gesendet. Wir sind noch dran — wir schreiben Ihnen, sobald wir ein Angebot haben.",
  el: "Καμία εταιρεία δεν έχει στείλει ακόμα τιμή για το αίτημα ενοικίασης αυτοκινήτου σας. Συνεχίζουμε να εργαζόμαστε — θα σας στείλουμε email μόλις έχουμε μια προσφορά.",
};

const NO_QUOTE_FOOT: Record<string, string> = {
  en: "Questions? Reply to this email, a real person reads it.",
  fr: "Une question ? Répondez à cet email, une vraie personne le lit.",
  de: "Fragen? Antworten Sie auf diese E-Mail, ein echter Mensch liest sie.",
  el: "Ερωτήσεις; Απαντήστε σε αυτό το email, το διαβάζει πραγματικός άνθρωπος.",
};

export async function sendCustomerNoQuoteYet(opts: { email: string; locale: string; customerName?: string }) {
  const l = NO_QUOTE_SUBJECT[opts.locale] ? opts.locale : "en";
  const greeting = opts.customerName ? `${opts.customerName}, ` : "";
  const inner = `
  <p style="margin:0 0 16px; color:${C.muted}; font-size:14px; line-height:1.6;">${greeting}${NO_QUOTE_BODY[l]}</p>
  <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center; line-height:1.6;">${NO_QUOTE_FOOT[l]}</p>
`;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.email,
    replyTo: RELAY_EMAIL,
    subject: NO_QUOTE_SUBJECT[l],
    html: kalimeraShell(inner),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

// ── Nouvelle offre disponible : notif client multi-devis ────────────────────

const NEW_OFFER_SUBJECT: Record<string, string> = {
  en: "A new offer for your Crete car rental",
  fr: "Une nouvelle offre pour votre location en Crète",
  de: "Ein neues Angebot für Ihre Mietwagen-Buchung auf Kreta",
  el: "Μια νέα προσφορά για την ενοικίαση αυτοκινήτου στην Κρήτη",
};

const NEW_OFFER_COPY: Record<string, { body: string; cta: string }> = {
  en: {
    body: "a new offer just arrived for your car rental at {pickupLabel}. More may follow. Compare and choose here:",
    cta: "Compare offers",
  },
  fr: {
    body: "une offre vient d'arriver pour votre location de voiture à {pickupLabel}. D'autres peuvent suivre. Comparez et choisissez ici :",
    cta: "Comparer les offres",
  },
  de: {
    body: "ein neues Angebot ist für Ihre Mietwagen-Anfrage in {pickupLabel} eingegangen. Weitere können folgen. Vergleichen und wählen Sie hier:",
    cta: "Angebote vergleichen",
  },
  el: {
    body: "μια νέα προσφορά μόλις έφτασε για την ενοικίαση αυτοκινήτου σας στο {pickupLabel}. Ενδέχεται να ακολουθήσουν κι άλλες. Συγκρίνετε και επιλέξτε εδώ:",
    cta: "Σύγκριση προσφορών",
  },
};

/** Notifie le client qu'une nouvelle offre est disponible (modèle multi-devis). */
export async function sendCustomerNewOffer(opts: {
  email: string; locale: string; customerName: string;
  offersUrl: string; pickupLabel: string;
}): Promise<void> {
  const l = NEW_OFFER_SUBJECT[opts.locale] ? opts.locale : "en";
  const c = NEW_OFFER_COPY[l];
  const body = c.body.replace("{pickupLabel}", opts.pickupLabel);
  const greeting = opts.customerName ? `${opts.customerName}, ` : "";
  const inner = `
  <p style="margin:0 0 20px; color:${C.muted}; font-size:14px; line-height:1.6;">${greeting}${body}</p>
  <div style="text-align:center; margin:0 0 18px;">${pillButton(opts.offersUrl, c.cta, C.lagoonDeep)}</div>
  <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center; line-height:1.6;">Questions ? Répondez à cet email, une vraie personne le lit.</p>
`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.email,
    replyTo: RELAY_EMAIL,
    subject: NEW_OFFER_SUBJECT[l],
    html: kalimeraShell(inner),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

/** Email court au loueur non retenu. Best-effort : appelé depuis accept route. */
export async function sendPartnerNotChosen(email: string, partnerName: string): Promise<void> {
  const first = partnerName.split(" ")[0] || partnerName;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: RELAY_EMAIL,
    subject: "Car Rental Direct - not selected this time",
    text: [
      `Hi ${first},`,
      ``,
      `The customer chose another offer this time. Thanks for your quote, more requests will come. No action needed.`,
      ``,
      `Kami`,
      `crete.direct`,
    ].join("\n"),
  });
  if (error) console.error("[sendPartnerNotChosen] Resend error:", error.message);
}

// ── Relances (cron car-relance) : loueur silencieux + client indécis ────────

/** Relance loueur qui n'a pas encore chiffré (1× max). EN, best-effort. */
export async function sendPartnerRelance(email: string, partnerName: string, quoteUrl: string): Promise<void> {
  const first = partnerName.split(" ")[0] || partnerName;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    replyTo: RELAY_EMAIL,
    subject: "Car Rental Direct - a customer is still waiting for your quote",
    text: [
      `Hi ${first},`,
      ``,
      `A customer is still waiting for your price on a crete.direct car rental request.`,
      `Send your quote here, or tell us you can't take it this time:`,
      quoteUrl,
      ``,
      `Referral commission is 10%. No action closes the request for you.`,
      ``,
      `Kami`,
      `crete.direct`,
    ].join("\n"),
  });
  if (error) console.error("[sendPartnerRelance] Resend error:", error.message);
}

const CUSTOMER_RELANCE_SUBJECT: Record<string, string> = {
  en: "Your Crete car rental offers are waiting",
  fr: "Vos offres de location en Crète vous attendent",
  de: "Ihre Mietwagen-Angebote auf Kreta warten auf Sie",
  el: "Οι προσφορές ενοικίασης αυτοκινήτου στην Κρήτη σας περιμένουν",
};

const CUSTOMER_RELANCE_COPY: Record<string, { body: string; cta: string }> = {
  en: {
    body: "your car rental offers are waiting. Choose the one that suits you, or let us know if none of them fits:",
    cta: "See my offers",
  },
  fr: {
    body: "vos offres de location vous attendent. Choisissez celle qui vous convient, ou dites-nous qu'aucune ne convient :",
    cta: "Voir mes offres",
  },
  de: {
    body: "Ihre Mietwagen-Angebote warten auf Sie. Wählen Sie das passende aus, oder sagen Sie uns, wenn keines passt:",
    cta: "Meine Angebote ansehen",
  },
  el: {
    body: "οι προσφορές ενοικίασης σας περιμένουν. Επιλέξτε αυτή που σας ταιριάζει, ή πείτε μας αν καμία δεν ταιριάζει:",
    cta: "Δείτε τις προσφορές μου",
  },
};

/** Relance client indécis avec ≥1 offre (max 2×). 4 langues, HTML brandé. */
export async function sendCustomerRelance(opts: {
  email: string; locale: string; customerName?: string; offersUrl: string;
}): Promise<void> {
  const l = CUSTOMER_RELANCE_SUBJECT[opts.locale] ? opts.locale : "en";
  const c = CUSTOMER_RELANCE_COPY[l];
  const greeting = opts.customerName ? `${opts.customerName}, ` : "";
  const inner = `
  <p style="margin:0 0 20px; color:${C.muted}; font-size:14px; line-height:1.6;">${greeting}${c.body}</p>
  <div style="text-align:center; margin:0 0 18px;">${pillButton(opts.offersUrl, c.cta, C.lagoonDeep)}</div>
  <p style="margin:0; color:${C.faint}; font-size:12px; text-align:center; line-height:1.6;">Questions ? Répondez à cet email, une vraie personne le lit.</p>
`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.email,
    replyTo: RELAY_EMAIL,
    subject: CUSTOMER_RELANCE_SUBJECT[l],
    html: kalimeraShell(inner),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
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
