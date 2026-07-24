"use client";
import { useState } from "react";
import type React from "react";
import type { StaysStrings } from "../content";

const FIELD =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-lagoon-deep transition-colors";
const LABEL = "block text-[13px] font-heading font-bold text-text mb-1.5";
const BUTTON =
  "inline-flex items-center justify-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

type Note = { tone: "info" | "ok" | "error"; text: string } | null;

export default function NewListingWizard({ strings }: { strings: StaysStrings["wizard"] }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [pubToken, setPubToken] = useState("");
  const [ical, setIcal] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote({ tone: "info", text: strings.importing });
    try {
      const r = await fetch("/api/stays/new", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          airbnbUrl: url,
          ownerEmail: email,
          basePriceEur: Number(price),
          website: "",
        }),
      });
      const j = await r.json();
      if (j.ok && j.slug) {
        setSlug(j.slug);
        setPubToken(j.publishToken ?? "");
        setNote({ tone: "ok", text: strings.draftCreated });
      } else {
        setNote({ tone: "error", text: strings.invalidLink });
      }
    } catch {
      setNote({ tone: "error", text: strings.invalidLink });
    } finally {
      setBusy(false);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote({ tone: "info", text: strings.publishing });
    try {
      const r = await fetch("/api/stays/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, icalUrl: ical, token: pubToken }),
      });
      const j = await r.json();
      if (j.ok) {
        setDone(true);
        setNote({ tone: "ok", text: strings.published });
      } else {
        setNote({ tone: "error", text: `${strings.error} : ${j.error ?? ""}` });
      }
    } catch {
      setNote({ tone: "error", text: strings.error });
    } finally {
      setBusy(false);
    }
  }

  const stepLabel = (n: 1 | 2) => (
    <p className="m-0 mb-4 text-[12px] uppercase tracking-wide text-text-muted font-data">
      {n} / 2 · {strings.steps[n - 1]}
    </p>
  );

  return (
    <div className="flex flex-col gap-5">
      {!slug && (
        <form onSubmit={createDraft} className="card-base p-6 flex flex-col gap-4">
          {stepLabel(1)}
          {/* Honeypot : invisible pour l'humain, rempli par les bots. Cf api/stays/new. */}
          <input
            type="text"
            name="website"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <div>
            <label className={LABEL} htmlFor="stay-url">{strings.urlLabel}</label>
            <input
              id="stay-url"
              className={FIELD}
              required
              placeholder={strings.urlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="stay-owner-email">{strings.emailLabel}</label>
            <input
              id="stay-owner-email"
              className={FIELD}
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="stay-price">{strings.priceLabel}</label>
            <input
              id="stay-price"
              className={FIELD}
              required
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="m-0 mt-1.5 text-[13px] text-text-muted">{strings.priceHelp}</p>
          </div>
          <button type="submit" className={BUTTON} disabled={busy}>
            {busy ? strings.importing : strings.submit}
          </button>
        </form>
      )}

      {slug && !done && (
        <form onSubmit={publish} className="card-base p-6 flex flex-col gap-4">
          {stepLabel(2)}
          <div>
            <label className={LABEL} htmlFor="stay-ical">{strings.icalTitle}</label>
            <p className="m-0 mb-2 text-[13px] text-text-muted leading-relaxed">
              {strings.icalHelp}
            </p>
            <input
              id="stay-ical"
              className={FIELD}
              required
              placeholder={strings.icalPlaceholder}
              value={ical}
              onChange={(e) => setIcal(e.target.value)}
            />
          </div>
          <button type="submit" className={BUTTON} disabled={busy}>
            {busy ? strings.publishing : strings.publish}
          </button>
        </form>
      )}

      {slug && done && (
        <div className="card-base p-6">
          <h2 className="m-0 font-heading font-extrabold text-xl text-text">
            {strings.exportTitle}
          </h2>
          <p className="mt-2 mb-3 text-[14px] text-text-muted leading-relaxed">
            {strings.exportHelp}
          </p>
          <code className="block break-all rounded-xl bg-sea-faint px-3.5 py-2.5 font-data text-[13px] text-text">
            https://crete.direct/api/stays/ical/{slug}
          </code>
        </div>
      )}

      {note && (
        <p
          role="status"
          className={`m-0 text-[14px] font-heading font-bold ${
            note.tone === "ok"
              ? "text-ok"
              : note.tone === "error"
                ? "text-terracotta"
                : "text-text-muted"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
