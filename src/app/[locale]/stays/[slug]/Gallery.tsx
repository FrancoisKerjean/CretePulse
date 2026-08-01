"use client";
// Galerie de la fiche. Defaut corrige ici : page.tsx ne rendait que photos[0] et
// jetait tout le reste, alors que la base porte 27, 15 et 13 photos sur les trois
// annonces publiees. Un seul etat : l index de la photo mise en avant.
// Pas de lightbox : la photo principale est deja en grande taille, un agrandissement
// couterait de l etat client pour rien.
import Image from "next/image";
import { useState } from "react";

export default function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [lead, setLead] = useState(0);
  if (photos.length === 0) return null;

  // Les 4 vignettes suivent la photo mise en avant, en tournant : on ne montre
  // jamais deux fois la meme image.
  const others = photos.filter((_, i) => i !== lead);
  const thumbs = others.slice(0, 4);
  const hidden = others.length - thumbs.length;

  return (
    <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="md:row-span-2">
        <Image
          src={photos[lead]}
          alt={alt}
          width={1200}
          height={800}
          className="h-64 w-full rounded-3xl object-cover md:h-full"
          priority
        />
      </div>
      {thumbs.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={() => setLead(photos.indexOf(src))}
          aria-label={`Photo ${photos.indexOf(src) + 1}`}
          className="relative h-24 overflow-hidden rounded-2xl md:h-full"
        >
          <Image
            src={src}
            alt=""
            width={480}
            height={320}
            className="h-full w-full object-cover transition-transform hover:scale-[1.03]"
          />
          {hidden > 0 && i === thumbs.length - 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-[12.5px] font-bold text-text">
              plus {hidden}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
