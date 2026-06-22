import { setRequestLocale } from "next-intl/server";
import { Megaphone, LinkIcon, Coins, Check } from "lucide-react";
import { buildAlternates } from "@/lib/seo";
import SignupForm from "./SignupForm";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T = {
  title: "Affiliate program · turn crete.direct traffic into bookings",
  heroLead: "Turn crete.direct traffic into",
  heroAccent: "bookings",
  badge: "Affiliate program",
  metaDesc:
    "Join the crete.direct affiliate program. Sign up in under a minute, get your tracked link instantly, and pay a commission only on the bookings we send you.",
  pitch:
    "crete.direct reaches travellers planning their trip to Crete · live guides, beaches, buses and the /explore directory, in several languages. We point that audience to your business. You pay a commission only on the bookings we refer.",
  pillCommission: "Commission on bookings only",
  pillFree: "No setup fee · no lock-in",
  stepsTitle: "How it works",
  steps: [
    { icon: "megaphone", text: "Sign up in 3-5 clicks · tell us your business and booking page." },
    { icon: "link", text: "Get your tracked link crete.direct/go/your-name instantly · it goes live right away." },
    { icon: "coins", text: "We send you visitors. You pay an agreed commission on the bookings they make." },
  ],
  dealTitle: "The deal",
  deal: [
    "Fair commission, agreed up front · only on bookings we refer.",
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

// Teintes signature crete.direct, une par étape (lagoon / terracotta / soleil).
const STEP_TINTS = [
  "bg-lagoon/12 text-lagoon-deep",
  "bg-terracotta/12 text-terracotta",
  "bg-sun/30 text-[#A8762B]",
] as const;

export default async function AffiliatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-surface">
      {/* HERO mer dégradée + soleil */}
      <section className="relative pt-20 pb-24 bg-gradient-to-b from-sky via-[#8FE0EC] to-lagoon overflow-hidden">
        <div
          className="absolute top-16 right-[8%] w-[110px] h-[110px] rounded-full shadow-[0_0_76px_22px_rgba(255,200,61,.45)]"
          style={{ background: "radial-gradient(circle at 38% 35%, #FFE08F, #FFC83D 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-3xl mx-auto px-4">
          <span className="inline-flex items-center gap-2 bg-white/72 rounded-full px-4 py-2 text-[13px] font-heading font-semibold text-sea">
            <span className="w-2 h-2 rounded-full bg-ok shadow-[0_0_0_4px_rgba(20,184,107,.25)]" />
            {T.badge}
          </span>

          <h1 className="font-heading font-extrabold text-4xl md:text-[52px] leading-[1.06] tracking-tight text-text mt-4 mb-4">
            {T.heroLead}{" "}
            <span className="text-white [text-shadow:0_2px_18px_rgba(11,94,120,.35)]">{T.heroAccent}</span>
          </h1>

          <p className="text-base md:text-lg text-[rgba(11,57,84,.8)] max-w-2xl leading-relaxed mb-6">{T.pitch}</p>

          <div className="flex flex-wrap gap-3">
            <span className="bg-sun text-text rounded-[17px] px-4 py-2.5 text-sm font-heading font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)]">
              {T.pillCommission}
            </span>
            <span className="bg-white text-sea rounded-[17px] px-4 py-2.5 text-sm font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)]">
              {T.pillFree}
            </span>
          </div>
        </div>

        {/* Vague de transition vers le fond surface */}
        <svg className="absolute bottom-0 left-0 w-full h-[60px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 40 C180 0 320 70 540 42 C760 14 900 66 1130 40 C1290 22 1380 36 1440 28 L1440 70 L0 70 Z"
            fill="#F6FBFC"
          />
        </svg>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-20">
        {/* HOW IT WORKS · cartes */}
        <h2 className="font-heading text-[28px] font-extrabold text-text mt-12 mb-5">{T.stepsTitle}</h2>
        <ol className="grid gap-4 sm:grid-cols-3 list-none p-0 m-0">
          {T.steps.map((s, i) => {
            const Icon = ICONS[s.icon as keyof typeof ICONS];
            return (
              <li key={i} className="card-base p-5">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl mb-3 ${STEP_TINTS[i]}`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <p className="text-sm text-text leading-relaxed m-0">{s.text}</p>
              </li>
            );
          })}
        </ol>

        {/* THE DEAL · bloc sable */}
        <section
          className="rounded-[30px] px-7 py-7 mt-10"
          style={{ background: "linear-gradient(165deg, #FFF3D6, #FFE9AE)" }}
        >
          <h2 className="font-heading font-extrabold text-[24px] text-text m-0 mb-4">{T.dealTitle}</h2>
          <ul className="space-y-3 list-none p-0 m-0">
            {T.deal.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px] text-text">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-terracotta mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FORMULAIRE */}
        <h2 className="font-heading text-[28px] font-extrabold text-text mt-12 mb-5">{T.formTitle}</h2>
        <SignupForm />
      </div>
    </main>
  );
}
