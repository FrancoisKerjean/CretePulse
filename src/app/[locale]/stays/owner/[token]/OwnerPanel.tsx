"use client";
import { useState } from "react";
import type { StaysStrings } from "../../content";
import type { CalendarNight, OwnerRequest, OwnerEarnings } from "@/lib/stays/owner-view";

type T = StaysStrings["owner"];

export interface PanelListing {
  id: number;
  slug: string;
  title: string;
  basePriceEur: number;
  cleaningFeeEur: number;
  minNights: number;
  published: boolean;
  icalExportUrl: string;
}

const FIELD =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-lagoon-deep transition-colors";
const LABEL = "block text-[13px] font-heading font-bold text-text mb-1.5";
const CARD = "card-base p-5 flex flex-col gap-4";
const H2 = "m-0 font-heading font-extrabold text-[19px] text-text";

const eur = (n: number) => `${n.toFixed(2)} €`;

export default function OwnerPanel({
  token, ownerName, listings, arrivals, earnings, nights, t,
}: {
  token: string;
  ownerName: string;
  listings: PanelListing[];
  arrivals: OwnerRequest[];
  earnings: OwnerEarnings;
  nights: Record<number, CalendarNight[]>;
  t: T;
}) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-16 flex flex-col gap-6">
        <header>
          <h1 className="font-heading font-extrabold text-3xl md:text-[38px] leading-[1.1] tracking-tight text-text mb-2">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {ownerName ? `${ownerName} · ` : ""}{t.intro}
          </p>
        </header>

        <Arrivals arrivals={arrivals} t={t} />
        <Money earnings={earnings} t={t} />

        {listings.map((l) => (
          <ListingBlock key={l.id} token={token} listing={l} nights={nights[l.id] ?? []} t={t} />
        ))}
      </div>
    </main>
  );
}

function Arrivals({ arrivals, t }: { arrivals: OwnerRequest[]; t: T }) {
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.arrivalsTitle}</h2>
      {arrivals.length === 0 ? (
        <p className="m-0 text-[14px] text-text-muted">{t.arrivalsEmpty}</p>
      ) : (
        <ul className="m-0 list-none p-0 flex flex-col gap-2.5">
          {arrivals.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2.5 last:border-0 last:pb-0">
              <span className="font-data font-bold text-text">{a.date_from}</span>
              <span className="text-text-muted text-[14px]">→ {a.date_to}</span>
              <span className="font-heading font-bold text-text">{a.guest_name}</span>
              {a.guest_phone ? (
                <a href={`tel:${a.guest_phone}`} className="text-sea text-[14px]">{a.guest_phone}</a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Money({ earnings, t }: { earnings: OwnerEarnings; t: T }) {
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.moneyTitle}</h2>
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="m-0 text-[13px] text-text-muted">{t.moneyReceived}</p>
          <p className="m-0 font-data font-bold text-[22px] text-text">{eur(earnings.receivedEur)}</p>
        </div>
        <div>
          <p className="m-0 text-[13px] text-text-muted">{t.moneyExpected}</p>
          <p className="m-0 font-data font-bold text-[22px] text-text-muted">{eur(earnings.expectedEur)}</p>
        </div>
      </div>

      {earnings.lines.length === 0 ? (
        <p className="m-0 text-[14px] text-text-muted">{t.moneyEmpty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="font-heading font-bold pb-2 pr-3">{t.colGuest}</th>
                <th className="font-heading font-bold pb-2 pr-3">{t.colDates}</th>
                <th className="font-heading font-bold pb-2 pr-3 text-right">{t.colTotal}</th>
                <th className="font-heading font-bold pb-2 pr-3 text-right">{t.colCommission}</th>
                <th className="font-heading font-bold pb-2 text-right">{t.colNet}</th>
              </tr>
            </thead>
            <tbody>
              {earnings.lines.map((l) => (
                <tr key={l.requestId} className="border-t border-border">
                  <td className="py-2 pr-3">{l.guestName}</td>
                  <td className="py-2 pr-3 font-data text-text-muted whitespace-nowrap">
                    {l.dateFrom} → {l.dateTo}
                  </td>
                  <td className="py-2 pr-3 text-right font-data">{eur(l.guestTotalEur)}</td>
                  <td className="py-2 pr-3 text-right font-data text-text-muted">− {eur(l.commissionEur)}</td>
                  <td className="py-2 text-right font-data font-bold">{eur(l.ownerNetEur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ListingBlock({
  token, listing, nights, t,
}: { token: string; listing: PanelListing; nights: CalendarNight[]; t: T }) {
  const [price, setPrice] = useState(String(listing.basePriceEur));
  const [cleaning, setCleaning] = useState(String(listing.cleaningFeeEur));
  const [minNights, setMinNights] = useState(String(listing.minNights));
  const [published, setPublished] = useState(listing.published);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/stays/owner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          listingId: listing.id,
          basePriceEur: Number(price),
          cleaningFeeEur: Number(cleaning),
          minNights: Number(minNights),
          published,
        }),
      });
      const j = await r.json();
      setNote(j.ok ? t.saved : (j.error ?? t.error));
    } catch {
      setNote(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function blockDates(action: "block" | "release") {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/stays/owner/block", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, listingId: listing.id, action, dateFrom: from, dateTo: to }),
      });
      const j = await r.json();
      // Un refus porte un message utile, par exemple la nuit deja vendue :
      // on l'affiche tel quel plutot qu'un message generique.
      setNote(j.ok ? t.saved : (j.error ?? t.error));
      if (j.ok) window.location.reload();
    } catch {
      setNote(t.error);
    } finally {
      setBusy(false);
    }
  }

  const originLabel: Record<CalendarNight["origin"], string> = {
    sold: t.originSold,
    ota: t.originOta,
    owner: t.originOwner,
    other: "",
  };

  return (
    <section className={CARD}>
      <h2 className={H2}>{listing.title}</h2>

      <div>
        <p className="m-0 mb-2 text-[13px] font-heading font-bold text-text">{t.priceTitle}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor={`p-${listing.id}`}>{t.priceLabel}</label>
            <input id={`p-${listing.id}`} className={FIELD} type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor={`c-${listing.id}`}>{t.cleaningLabel}</label>
            <input id={`c-${listing.id}`} className={FIELD} type="number" min={0} value={cleaning} onChange={(e) => setCleaning(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor={`m-${listing.id}`}>{t.minNightsLabel}</label>
            <input id={`m-${listing.id}`} className={FIELD} type="number" min={1} value={minNights} onChange={(e) => setMinNights(e.target.value)} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-lagoon-deep" />
          <span className="text-[14px] text-text">{t.statusOnline}</span>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-3 inline-flex items-center justify-center bg-sun text-text rounded-full px-5 py-2.5 text-[14px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60"
        >
          {t.save}
        </button>
      </div>

      <div className="border-t border-border pt-4">
        <p className="m-0 mb-2 text-[13px] font-heading font-bold text-text">{t.calendarTitle}</p>
        {nights.length === 0 ? (
          <p className="m-0 text-[14px] text-text-muted">{t.calendarEmpty}</p>
        ) : (
          <ul className="m-0 list-none p-0 flex flex-wrap gap-1.5">
            {nights.map((n) => (
              <li
                key={n.date}
                title={originLabel[n.origin]}
                className={`rounded-full px-2.5 py-1 text-xs font-data ${
                  n.origin === "sold"
                    ? "bg-ok text-white"
                    : n.origin === "ota"
                      ? "bg-text-light text-white"
                      : "border border-border bg-white text-text-muted"
                }`}
              >
                {n.date}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="m-0 mb-2 text-[13px] font-heading font-bold text-text">{t.blockTitle}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor={`f-${listing.id}`}>{t.blockFrom}</label>
            <input id={`f-${listing.id}`} className={FIELD} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor={`t-${listing.id}`}>{t.blockTo}</label>
            <input id={`t-${listing.id}`} className={FIELD} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button type="button" onClick={() => blockDates("block")} disabled={busy || !from || !to}
            className="rounded-full border border-border bg-white px-4 py-2 text-[14px] font-heading font-bold disabled:opacity-60">
            {t.blockAction}
          </button>
          <button type="button" onClick={() => blockDates("release")} disabled={busy || !from || !to}
            className="rounded-full border border-border bg-white px-4 py-2 text-[14px] font-heading font-bold text-text-muted disabled:opacity-60">
            {t.releaseAction}
          </button>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="m-0 mb-1 text-[13px] font-heading font-bold text-text">{t.icalTitle}</p>
        <p className="m-0 mb-2 text-[13px] text-text-muted leading-relaxed">{t.icalHelp}</p>
        <code className="block break-all rounded-xl bg-surface-alt px-3 py-2 text-[12.5px] text-text-muted">
          {listing.icalExportUrl}
        </code>
      </div>

      {note && (
        <p role="status" className="m-0 text-[14px] font-heading font-bold text-text">{note}</p>
      )}
    </section>
  );
}
