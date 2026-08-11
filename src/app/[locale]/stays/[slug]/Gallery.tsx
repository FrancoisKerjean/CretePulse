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

  // Les vignettes suivent la photo mise en avant, en tournant : on ne montre
  // jamais deux fois la meme image.
  const others = photos.filter((_, i) => i !== lead);
  const hidden = others.length - 4;

  // ⛔ UNE seule liste pour les deux mises en page, jamais deux arbres DOM :
  // en dupliquer un ferait rendre 27 images deux fois par fiche.
  // Mobile  : defilement horizontal avec accrochage, TOUTES les photos accessibles.
  //           La mosaique empilait la grande plus 4 vignettes, soit 672 px de haut.
  // Desktop : la mosaique d origine, inchangee. Les photos au dela de la 4e
  //           vignette sont masquees la, pas retirees du DOM.
  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:overflow-visible md:pb-0">
      <div className="w-[86%] shrink-0 snap-center md:w-auto md:row-span-2">
        <Image
          src={photos[lead]}
          alt={alt}
          width={1200}
          height={800}
          className="h-64 w-full rounded-3xl object-cover md:h-full"
          priority
        />
      </div>
      {others.map((src, i) => (
        <button
          key={src}
          type="button"
          onClick={() => setLead(photos.indexOf(src))}
          aria-label={`Photo ${photos.indexOf(src) + 1}`}
          // ⛔ Inerte au doigt sous md : mettre une photo en avant la deplacerait
          // en tete du carrousel, sous le doigt qui vient de la toucher. Le geste
          // mobile est de faire defiler, pas de promouvoir.
          className={`relative h-64 w-[86%] shrink-0 snap-center overflow-hidden rounded-3xl pointer-events-none md:pointer-events-auto md:h-full md:w-auto md:rounded-2xl ${
            i >= 4 ? "md:hidden" : ""
          }`}
        >
          <Image
            src={src}
            alt=""
            width={480}
            height={320}
            className="h-full w-full object-cover transition-transform md:hover:scale-[1.03]"
          />
          {/* Le compteur ne vaut que la ou des photos sont hors de portee : sur
              mobile elles sont toutes dans le carrousel. */}
          {hidden > 0 && i === 3 && (
            <span className="absolute bottom-2 right-2 hidden rounded-full bg-white/95 px-3 py-1 text-[12.5px] font-bold text-text md:block">
              plus {hidden}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
