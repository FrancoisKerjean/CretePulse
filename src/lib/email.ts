import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Crete Direct <hello@crete.direct>";

const CONFIRM_SUBJECTS: Record<string, string> = {
  en: "Confirm your subscription to Crete Direct",
  fr: "Confirmez votre inscription à Crete Direct",
  de: "Bestätigen Sie Ihr Abonnement bei Crete Direct",
  el: "Επιβεβαιώστε την εγγραφή σας στο Crete Direct",
};

const CONFIRM_BODY: Record<string, (url: string) => string> = {
  en: (url) => `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Almost there!</h2>
      <p style="color: #6B7280; line-height: 1.6; margin-bottom: 24px;">Click the button below to confirm your subscription to the weekly Crete briefing.</p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background: #B85C38; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Confirm my subscription</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; text-align: center;">If you didn't sign up, just ignore this email.</p>
    </div>
  `,
  fr: (url) => `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Presque terminé !</h2>
      <p style="color: #6B7280; line-height: 1.6; margin-bottom: 24px;">Cliquez sur le bouton ci-dessous pour confirmer votre inscription au briefing hebdo Crète.</p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background: #B85C38; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Confirmer mon inscription</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; text-align: center;">Si vous ne vous êtes pas inscrit, ignorez cet email.</p>
    </div>
  `,
  de: (url) => `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Fast geschafft!</h2>
      <p style="color: #6B7280; line-height: 1.6; margin-bottom: 24px;">Klicken Sie auf den Button, um Ihr Abonnement des wöchentlichen Kreta-Briefings zu bestätigen.</p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background: #B85C38; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Abonnement bestätigen</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; text-align: center;">Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail.</p>
    </div>
  `,
  el: (url) => `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Σχεδόν έτοιμο!</h2>
      <p style="color: #6B7280; line-height: 1.6; margin-bottom: 24px;">Κάντε κλικ στο παρακάτω κουμπί για να επιβεβαιώσετε την εγγραφή σας στο εβδομαδιαίο ενημερωτικό δελτίο Κρήτης.</p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${url}" style="display: inline-block; background: #B85C38; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Επιβεβαίωση εγγραφής</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; text-align: center;">Αν δεν εγγραφήκατε, αγνοήστε αυτό το email.</p>
    </div>
  `,
};

export async function sendConfirmationEmail(email: string, token: string, locale: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
  const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${token}`;
  const lang = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";

  const bodyFn = CONFIRM_BODY[lang] || CONFIRM_BODY.en;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: CONFIRM_SUBJECTS[lang] || CONFIRM_SUBJECTS.en,
    html: bodyFn(confirmUrl),
  });
}

const WELCOME_SUBJECTS: Record<string, string> = {
  en: "Welcome to Crete Direct - Your weekly briefing starts Monday",
  fr: "Bienvenue sur Crete Direct - Votre briefing hebdo commence lundi",
  de: "Willkommen bei Crete Direct - Ihr wöchentliches Briefing startet Montag",
  el: "Καλώς ήρθατε στο Crete Direct - Το εβδομαδιαίο δελτίο ξεκινά Δευτέρα",
};

const WELCOME_BODIES: Record<string, string> = {
  en: `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">You're in!</h2>
      <p style="color: #6B7280; line-height: 1.6;">Every Monday, you'll receive:</p>
      <ul style="color: #6B7280; line-height: 1.8; padding-left: 20px;">
        <li>This week's weather forecast for 10 cities</li>
        <li>Upcoming events and festivals</li>
        <li>One hand-picked article about Crete</li>
      </ul>
      <p style="color: #6B7280; line-height: 1.6; margin-top: 16px;">In the meantime, explore:</p>
      <div style="margin: 16px 0;">
        <a href="https://crete.direct/en/beaches" style="display: inline-block; background: #1B4965; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px;">500+ Beaches</a>
        <a href="https://crete.direct/en/weather" style="display: inline-block; background: #B85C38; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Live Weather</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; text-align: center;">Free. Independent. Updated hourly.</p>
    </div>`,
  fr: `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">C'est fait !</h2>
      <p style="color: #6B7280; line-height: 1.6;">Chaque lundi, vous recevrez :</p>
      <ul style="color: #6B7280; line-height: 1.8; padding-left: 20px;">
        <li>Les prévisions météo pour 10 villes</li>
        <li>Les événements et festivals à venir</li>
        <li>Un article sélectionné sur la Crète</li>
      </ul>
      <p style="color: #6B7280; line-height: 1.6; margin-top: 16px;">En attendant, explorez :</p>
      <div style="margin: 16px 0;">
        <a href="https://crete.direct/fr/beaches" style="display: inline-block; background: #1B4965; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px;">500+ Plages</a>
        <a href="https://crete.direct/fr/weather" style="display: inline-block; background: #B85C38; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Météo Live</a>
      </div>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; text-align: center;">Gratuit. Indépendant. Mis à jour chaque heure.</p>
    </div>`,
  de: `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Sie sind dabei!</h2>
      <p style="color: #6B7280; line-height: 1.6;">Jeden Montag erhalten Sie:</p>
      <ul style="color: #6B7280; line-height: 1.8; padding-left: 20px;">
        <li>Wettervorhersage für 10 Städte</li>
        <li>Kommende Events und Festivals</li>
        <li>Einen ausgewählten Artikel über Kreta</li>
      </ul>
      <div style="margin: 16px 0;">
        <a href="https://crete.direct/de/beaches" style="display: inline-block; background: #1B4965; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px;">500+ Strände</a>
        <a href="https://crete.direct/de/weather" style="display: inline-block; background: #B85C38; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Live Wetter</a>
      </div>
    </div>`,
  el: `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 24px; font-weight: 800; color: #1B4965;">CRETE</span>
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #B85C38; margin: 0 4px; vertical-align: middle;"></span>
        <span style="font-size: 24px; font-weight: 800; color: #B85C38;">DIRECT</span>
      </div>
      <h2 style="color: #1A1A2E; font-size: 20px; margin-bottom: 16px;">Είστε μέσα!</h2>
      <p style="color: #6B7280; line-height: 1.6;">Κάθε Δευτέρα θα λαμβάνετε:</p>
      <ul style="color: #6B7280; line-height: 1.8; padding-left: 20px;">
        <li>Πρόγνωση καιρού για 10 πόλεις</li>
        <li>Επερχόμενες εκδηλώσεις και φεστιβάλ</li>
        <li>Ένα επιλεγμένο άρθρο για την Κρήτη</li>
      </ul>
      <div style="margin: 16px 0;">
        <a href="https://crete.direct/el/beaches" style="display: inline-block; background: #1B4965; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-right: 8px;">500+ Παραλίες</a>
        <a href="https://crete.direct/el/weather" style="display: inline-block; background: #B85C38; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Live Καιρός</a>
      </div>
    </div>`,
};

export async function sendWelcomeEmail(email: string, locale: string) {
  const lang = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: WELCOME_SUBJECTS[lang] || WELCOME_SUBJECTS.en,
    html: WELCOME_BODIES[lang] || WELCOME_BODIES.en,
  });
}
