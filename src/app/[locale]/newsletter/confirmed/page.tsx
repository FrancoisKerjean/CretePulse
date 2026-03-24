import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default async function NewsletterConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="flex justify-center mb-5">
          <div className="bg-aegean-faint rounded-full p-4">
            <CheckCircle className="size-8 text-aegean" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-text mb-3">
          Subscription confirmed
        </h1>
        <p className="text-text-muted leading-relaxed mb-7">
          You're on the list. We'll send you the best of Crete — events,
          weather updates, and hidden gems — straight to your inbox.
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-aegean text-white font-medium rounded-lg hover:bg-aegean-light transition-colors"
        >
          Back to Crete Direct
        </Link>
      </div>
    </main>
  );
}
