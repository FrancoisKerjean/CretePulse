// Page de confirmation newsletter. Elle n'écrit RIEN : le bouton poste vers
// /api/newsletter/confirm, seul chemin qui confirme. Un antivirus de messagerie
// qui ouvre le lien du mail arrive ici et repart sans rien avoir confirmé.
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { MailCheck } from "lucide-react";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { normalizeLang, type NewsletterLang } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Confirm your subscription | Crete Direct",
    robots: { index: false, follow: false },
  };
}

const COPY: Record<NewsletterLang, {
  title: string; body: string; cta: string; notYou: string;
  invalidTitle: string; invalidBody: string; back: string;
}> = {
  en: {
    title: "Confirm your subscription",
    body: "One click and the Crete briefing reaches you every Monday: weather, where to swim, events.",
    cta: "Confirm my subscription",
    notYou: "Didn't sign up? Close this page, nothing will happen.",
    invalidTitle: "Link expired",
    invalidBody: "This link has expired or was already used.",
    back: "Back to Crete Direct",
  },
  fr: {
    title: "Confirmez votre inscription",
    body: "Un clic et le briefing Crète vous arrive chaque lundi : météo, où se baigner, événements.",
    cta: "Confirmer mon inscription",
    notYou: "Vous ne vous êtes pas inscrit ? Fermez cette page, il ne se passera rien.",
    invalidTitle: "Lien expiré",
    invalidBody: "Ce lien a expiré ou a déjà servi.",
    back: "Retour à Crete Direct",
  },
  de: {
    title: "Bestätigen Sie Ihr Abonnement",
    body: "Ein Klick, und das Kreta-Briefing kommt jeden Montag: Wetter, Badestellen, Veranstaltungen.",
    cta: "Abonnement bestätigen",
    notYou: "Nicht angemeldet? Schließen Sie diese Seite, es passiert nichts.",
    invalidTitle: "Link abgelaufen",
    invalidBody: "Dieser Link ist abgelaufen oder wurde bereits verwendet.",
    back: "Zurück zu Crete Direct",
  },
  el: {
    title: "Επιβεβαιώστε την εγγραφή σας",
    body: "Με ένα κλικ, το δελτίο της Κρήτης έρχεται κάθε Δευτέρα: καιρός, πού να κολυμπήσετε, εκδηλώσεις.",
    cta: "Επιβεβαίωση εγγραφής",
    notYou: "Δεν εγγραφήκατε; Κλείστε αυτή τη σελίδα, δεν θα συμβεί τίποτα.",
    invalidTitle: "Ο σύνδεσμος έληξε",
    invalidBody: "Αυτός ο σύνδεσμος έληξε ή έχει ήδη χρησιμοποιηθεί.",
    back: "Πίσω στο Crete Direct",
  },
};

export default async function NewsletterConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token = "" } = await searchParams;
  setRequestLocale(locale);
  const c = COPY[normalizeLang(locale)];

  const { data } = token
    ? await supabase.from("newsletter_subscribers").select("id").eq("confirm_token", token).limit(1)
    : { data: null };
  const valid = Boolean(data?.length);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-soft">
        <div className="flex justify-center mb-5">
          <div className="bg-sea-faint rounded-full p-4">
            <MailCheck className="size-8 text-sea" />
          </div>
        </div>
        {valid ? (
          <>
            <h1 className="text-2xl font-semibold text-text mb-3">{c.title}</h1>
            <p className="text-text-muted leading-relaxed mb-7">{c.body}</p>
            <form method="post" action="/api/newsletter/confirm">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-sea text-white font-medium rounded-lg hover:bg-sea-light transition-colors"
              >
                {c.cta}
              </button>
            </form>
            <p className="text-sm text-text-muted mt-5">{c.notYou}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-text mb-3">{c.invalidTitle}</h1>
            <p className="text-text-muted leading-relaxed mb-7">{c.invalidBody}</p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-sea text-white font-medium rounded-lg hover:bg-sea-light transition-colors"
            >
              {c.back}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
