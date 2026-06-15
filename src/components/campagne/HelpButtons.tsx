"use client";
import { useState } from "react";
import type { CampagneCopy } from "@/lib/campagne";
import { LINKS, buildShareUrl, getShare } from "@/lib/campagne";

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M14.6 8.4h2.2V5.4h-2.6c-2.3 0-3.5 1.4-3.5 3.6v1.7H8.2v3.1h2.5V21h3.1v-7.2h2.2l.4-3.1h-2.6V9.3c0-.7.3-.9.9-.9Z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="6" r="2.6" />
      <circle cx="17.5" cy="18" r="2.6" />
      <path d="M8.3 10.8 15.2 7.2M8.3 13.2l6.9 3.6" />
    </svg>
  );
}

const BTN =
  "inline-flex items-center gap-2.5 rounded-full border-[3px] border-[var(--color-text)] px-6 py-3.5 text-[clamp(17px,2.4vw,22px)] font-extrabold text-[var(--color-text)] shadow-[0_7px_0_var(--color-text)]";

export default function HelpButtons({ locale, copy }: { locale: string; copy: CampagneCopy }) {
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(locale);
  const share = getShare(locale);

  const onShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: share.title, text: share.text, url });
        return;
      } catch {
        /* annule */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="mt-7 flex flex-wrap justify-center gap-4">
      <a className={`${BTN} bg-terra text-white`} href={LINKS.instagram} target="_blank" rel="noopener noreferrer">
        <IgIcon />
        {copy.buttons.instagram}
      </a>
      <a className={`${BTN} bg-white`} href={LINKS.facebook} target="_blank" rel="noopener noreferrer">
        <FbIcon />
        {copy.buttons.facebook}
      </a>
      <button type="button" className={`${BTN} bg-sun`} onClick={onShare}>
        <ShareIcon />
        {copied ? "✓" : copy.buttons.share}
      </button>
    </div>
  );
}
