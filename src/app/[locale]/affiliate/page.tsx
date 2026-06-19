import { setRequestLocale } from "next-intl/server";
import { Megaphone, LinkIcon, Coins } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import { AFFILIATE_DEFAULT_COMMISSION_PCT } from "@/lib/affiliate";
import SignupForm from "./SignupForm";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T = {
  title: "Affiliate program · turn crete.direct traffic into bookings",
  metaDesc:
    "Join the crete.direct affiliate program. Sign up in under a minute, get your tracked link instantly, and pay a commission only on the bookings we send you.",
  pitch:
    "crete.direct reaches travellers planning their trip to Crete · live guides, beaches, buses and the /explore directory, in several languages. We point that audience to your business. You pay a commission only on the bookings we refer.",
  steps: [
    { icon: "megaphone", text: "Sign up in 3-5 clicks · tell us your business and booking page." },
    { icon: "link", text: "Get your tracked link crete.direct/go/your-name instantly · it goes live right away." },
    { icon: "coins", text: "We send you visitors. You pay an agreed commission on the bookings they make." },
  ],
  dealTitle: "The deal",
  deal: [
    `${AFFILIATE_DEFAULT_COMMISSION_PCT}% commission on referred bookings (agreed up front).`,
    "Transparent click reporting · we reconcile bookings with you, no hidden numbers.",
    "No setup fee, no lock-in. Cancel whenever you want.",
  ],
  formTitle: "Become an affiliate",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return {
    title: `${T.title} | Crete Direct`,
    description: T.metaDesc,
    alternates: buildAlternates(locale, "/affiliate"),
    openGraph: { title: T.title, description: T.metaDesc, url: `${BASE_URL}/${locale}/affiliate`, type: "website" },
  };
}

const ICONS = { megaphone: Megaphone, link: LinkIcon, coins: Coins } as const;

export default async function AffiliatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean mb-4">{T.title}</h1>
        <p className="text-text mb-8">{T.pitch}</p>

        <ol className="space-y-3 mb-10 list-none p-0">
          {T.steps.map((s, i) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS];
            return (
              <li key={i} className="flex items-start gap-3 text-sm text-text">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aegean/10 text-aegean">
                  <Icon className="w-4 h-4" />
                </span>
                {s.text}
              </li>
            );
          })}
        </ol>

        <h2 className="text-xl font-semibold text-text mb-3">{T.dealTitle}</h2>
        <ul className="space-y-2 mb-10 list-disc pl-5">
          {T.deal.map((d, i) => (
            <li key={i} className="text-sm text-text">{d}</li>
          ))}
        </ul>

        <h2 className="text-xl font-semibold text-text mb-4">{T.formTitle}</h2>
        <SignupForm commissionPct={AFFILIATE_DEFAULT_COMMISSION_PCT} />
      </div>
    </main>
  );
}
