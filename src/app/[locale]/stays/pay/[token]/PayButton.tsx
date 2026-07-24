"use client";
import { useState } from "react";

export default function PayButton({ token, locale }: { token: string; locale: string }) {
  const [msg, setMsg] = useState("");
  async function pay() {
    setMsg("Redirection vers le paiement…");
    const r = await fetch("/api/stays/pay", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, locale }),
    });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else setMsg(`Erreur : ${j.error ?? ""}`);
  }
  return (<div><button onClick={pay}>Payer l&apos;acompte (30%)</button>{msg && <p role="status">{msg}</p>}</div>);
}
