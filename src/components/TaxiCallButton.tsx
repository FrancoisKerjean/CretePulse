"use client";

import { Phone } from "lucide-react";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

export function TaxiCallButton({ phone, zone, pair, partner }: {
  phone: string; zone: string; pair: string; partner: string;
}) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      onClick={() => window.plausible?.("Taxi Call", { props: { zone, pair, partner } })}
      className="inline-flex items-center gap-2 rounded-lg bg-aegean text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
    >
      <Phone className="w-4 h-4" /> {phone}
    </a>
  );
}
