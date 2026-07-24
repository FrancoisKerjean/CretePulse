"use client";
import { useState } from "react";
import type React from "react";

export default function RequestForm({ slug }: { slug: string }) {
  const [f, setF] = useState({ guestName: "", guestEmail: "", dateFrom: "", dateTo: "", pax: "2", message: "" });
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Envoi…");
    const r = await fetch("/api/stays/request", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, pax: Number(f.pax), slug, website: "" }),
    });
    const j = await r.json();
    setMsg(j.ok ? "Demande envoyée. Le propriétaire vous répond sous peu." : "Erreur, réessayez.");
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit}>
      <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
      <input required placeholder="Nom" value={f.guestName} onChange={set("guestName")} />
      <input required type="email" placeholder="Email" value={f.guestEmail} onChange={set("guestEmail")} />
      <input required type="date" value={f.dateFrom} onChange={set("dateFrom")} />
      <input required type="date" value={f.dateTo} onChange={set("dateTo")} />
      <input required type="number" min={1} value={f.pax} onChange={set("pax")} />
      <textarea placeholder="Message" value={f.message} onChange={set("message")} />
      <button type="submit">Demander ces dates</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
