import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle } from "lucide-react";

export async function generateMetadata() {
  return {
    title: "Subscription Confirmed | Crete Direct",
    description: "You are now subscribed to the Crete Direct weekly briefing.",
    robots: { index: false, follow: false },
  };
}

export default async function NewsletterConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-soft">
        <div className="flex justify-center mb-5">
          <div className="bg-sea-faint rounded-full p-4">
            <CheckCircle className="size-8 text-sea" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-text mb-3">
          Subscription confirmed
        </h1>
        <p className="text-text-muted leading-relaxed mb-7">
          You&apos;re on the list. We&apos;ll send you the best of Crete · events,
          weather updates, and hidden gems · straight to your inbox.
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-sea text-white font-medium rounded-lg hover:bg-sea-light transition-colors"
        >
          Back to Crete Direct
        </Link>
      </div>
    </main>
  );
}
