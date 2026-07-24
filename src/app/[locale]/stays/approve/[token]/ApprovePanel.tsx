"use client";
import { useState } from "react";

export default function ApprovePanel({ token }: { token: string }) {
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState("");
  async function act(action: "accept" | "decline") {
    setMsg("…");
    const r = await fetch("/api/stays/approve", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, action, price: Number(price) }),
    });
    const j = await r.json();
    if (j.kycUrl) { window.location.href = j.kycUrl; return; }
    setMsg(j.approved ? "Accepté ✅ Le voyageur reçoit le lien de paiement." : j.declined ? "Refusé." : `Erreur : ${j.error ?? ""}`);
  }
  return (
    <div>
      <input type="number" placeholder="Votre prix net (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <button onClick={() => act("accept")}>Accepter</button>
      <button onClick={() => act("decline")}>Refuser</button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
