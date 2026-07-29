// /stays/approve/[token] : panneau proprietaire, atteint depuis l'email de demande.
// Le proprietaire confirme ou ajuste son prix net, ou refuse.
// Noindex (cf ../../metadata.ts) : page privee servie par token.
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { L, pickStaysLocale } from "../../content";
import { staysMetadata } from "../../metadata";
import ApprovePanel from "./ApprovePanel";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; token: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  return staysMetadata(locale, "approve");
}

export default async function ApprovePage(
  { params }: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = L[pickStaysLocale(locale)];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
        <header className="mb-7">
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-3">
            {t.approve.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">{t.approve.intro}</p>
        </header>
        <ApprovePanel token={token} strings={t.approve} />
      </div>
    </main>
  );
}
