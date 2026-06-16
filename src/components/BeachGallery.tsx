"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function BeachGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (!photos || photos.length === 0) return null;
  const prev = () => setIdx((idx - 1 + photos.length) % photos.length);
  const next = () => setIdx((idx + 1) % photos.length);

  return (
    <div className="relative h-56 md:h-72 rounded-xl overflow-hidden bg-aegean/5 mb-8">
      <img src={photos[idx]} alt={alt} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      {photos.length > 1 && (
        <>
          <button onClick={prev} aria-label="Précédent"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} aria-label="Suivant"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 right-2 text-xs bg-black/55 text-white px-2 py-0.5 rounded">
            {idx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}
