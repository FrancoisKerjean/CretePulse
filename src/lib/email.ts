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
