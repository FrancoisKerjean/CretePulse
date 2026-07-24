"use client";
import { useState } from "react";

const T = {
  en: { rate:"Your rating", name:"Name", email:"E-mail", comment:"Comment (optional)", submit:"Submit", check:"Check your inbox to publish your review.", err:"Could not submit. Try again later.", consent:"I consent to the publication of my review on crete.direct." },
  fr: { rate:"Ta note", name:"Nom",   email:"E-mail", comment:"Commentaire (facultatif)", submit:"Envoyer", check:"Vérifie ta boîte mail pour publier ton avis.", err:"Échec de l'envoi. Réessaie plus tard.", consent:"J'accepte la publication de mon avis sur crete.direct." },
  de: { rate:"Bewertung", name:"Name",email:"E-Mail", comment:"Kommentar (optional)", submit:"Senden", check:"Schau in dein Postfach, um zu veröffentlichen.", err:"Senden fehlgeschlagen.", consent:"Ich stimme der Veröffentlichung meiner Bewertung zu." },
  el: { rate:"Βαθμολογία", name:"Όνομα", email:"E-mail", comment:"Σχόλιο (προαιρετικά)", submit:"Υποβολή", check:"Έλεγξε το email σου για δημοσίευση.", err:"Η υποβολή απέτυχε.", consent:"Συναινώ στη δημοσίευση της κριτικής μου." },
} as const;
type L = keyof typeof T;

export function ReviewForm({ slug, placeName, locale }: { slug: string; placeName: string; locale: string }) {
  const l = (locale in T ? locale : "en") as L;
  const t = T[l];
  const [state, setState] = useState<"idle"|"submitting"|"check-email"|"error">("idle");
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting" || !consent || rating < 1 || rating > 5) return;
    setState("submitting");
    try {
      const r = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, place_name: placeName, rating, comment, author_name: name, email, locale, website }),
      });
      if (r.ok) setState("check-email");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "check-email") return <p className="rounded-2xl border border-sand-warm bg-white p-4">{t.check}</p>;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-sand-warm bg-white p-4 space-y-3">
      <div>
        <label className="block text-sm">{t.rate}</label>
        <div className="flex gap-1 text-2xl">
          {[1,2,3,4,5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? "text-sea" : "opacity-40"} aria-label={`${n}★`}>★</button>
          ))}
        </div>
      </div>
      <input className="w-full rounded-lg border p-2" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      <input className="w-full rounded-lg border p-2" placeholder={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <textarea className="w-full rounded-lg border p-2" placeholder={t.comment} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} />
      <input type="text" name="website" tabIndex={-1} aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} autoComplete="off" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>{t.consent}</span>
      </label>
      <button type="submit" disabled={state === "submitting" || !consent || rating < 1} className="rounded-lg bg-sea px-4 py-2 text-white disabled:opacity-50">{t.submit}</button>
      {state === "error" && <p className="text-terracotta text-sm">{t.err}</p>}
    </form>
  );
}
