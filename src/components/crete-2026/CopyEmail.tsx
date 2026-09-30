"use client";

// Bouton « Copier l'adresse » de la page crete-2026. L'adresse reste affichée en texte
// (sélectionnable) : si le presse-papiers est refusé, on la sélectionne à la place.
import { useRef, useState } from "react";
import s from "./crete-2026.module.css";

export function CopyEmail({ email, labels }: { email: string; labels: { copy: string; copied: string; selected: string } }) {
  const addr = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState(labels.copy);

  const done = (text: string) => {
    setLabel(text);
    setTimeout(() => setLabel(labels.copy), 1800);
  };
  const select = () => {
    const el = addr.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    done(labels.selected);
  };
  const copy = () => {
    if (!navigator.clipboard) return select();
    navigator.clipboard.writeText(email).then(() => done(labels.copied), select);
  };

  return (
    <>
      <span ref={addr} className={s.addr}>{email}</span>
      <button type="button" className={s.copyBtn} onClick={copy} aria-live="polite">{label}</button>
    </>
  );
}
