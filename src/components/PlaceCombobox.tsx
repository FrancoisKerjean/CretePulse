"use client";

// Autocomplete de lieux : input filtrant + liste cliquable, clavier (fleches,
// Enter, Escape), fermeture au clic dehors. Zero dependance. La liste des
// lieux est fournie en prop (deja chargee par la page /buses).
import { useEffect, useId, useRef, useState } from "react";

export function PlaceCombobox({
  value, onChange, options, placeholder, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Sync quand la valeur change de l'exterieur (swap, geoloc, deep-link).
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  function commit(v: string) {
    onChange(v); setQuery(v); setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && filtered[active]) { e.preventDefault(); commit(filtered[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-lagoon/40"
      />
      {open && filtered.length > 0 && (
        <ul id={listId} role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-border rounded-2xl shadow-lg py-1 list-none m-0 p-0">
          {filtered.map((o, i) => (
            <li key={o} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-2 text-sm cursor-pointer ${i === active ? "bg-surface text-text" : "text-text"}`}>
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
