"use client";
import { useState } from "react";
import type React from "react";

export default function NewListingWizard() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [ical, setIcal] = useState("");
  const [msg, setMsg] = useState("");

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Import en cours…");
    const r = await fetch("/api/stays/new", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ airbnbUrl: url, ownerEmail: email, basePriceEur: Number(price), website: "" }),
    });
    const j = await r.json();
    if (j.ok && j.slug) { setSlug(j.slug); setMsg("Brouillon créé. Ajoutez votre iCal privé Airbnb pour publier."); }
    else setMsg("Lien invalide, réessayez.");
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Publication…");
    const r = await fetch("/api/stays/publish", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, icalUrl: ical }),
    });
    const j = await r.json();
    setMsg(j.ok ? "Annonce publiée ✅" : `Erreur : ${j.error}`);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {!slug && (
        <form onSubmit={createDraft}>
          <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
          <input required placeholder="Lien Airbnb" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input required type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required type="number" placeholder="Votre prix net / séjour (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="submit">Créer mon annonce</button>
        </form>
      )}
      {slug && (
        <form onSubmit={publish}>
          <p>Collez l&apos;URL de votre <strong>iCal privé Airbnb</strong> (Calendrier → Disponibilité → Synchroniser).</p>
          <input required placeholder="https://www.airbnb.com/calendar/ical/….ics" value={ical} onChange={(e) => setIcal(e.target.value)} />
          <button type="submit">Publier</button>
          <p style={{ marginTop: 12 }}>Puis ajoutez notre iCal d&apos;export dans Airbnb :<br />
            <code>https://crete.direct/api/stays/ical/{slug}</code></p>
        </form>
      )}
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
