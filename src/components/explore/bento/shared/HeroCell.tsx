import Image from "next/image";
import { PhotoTrigger } from "@/components/explore/PhotoLightbox";

export function HeroCell({
  name, tag, photo, className = "", lightboxIndex,
}: {
  name: string;
  tag: string;
  photo?: string | null;
  className?: string;
  lightboxIndex?: number;
}) {
  return (
    <div className={`relative flex flex-col justify-end overflow-hidden rounded-2xl bg-aegean p-4 ${className}`}>
      {photo ? (
        <Image src={photo} alt={name} fill priority sizes="(max-width:768px) 100vw, 66vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-aegean to-aegean-light" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      {photo && lightboxIndex !== undefined && (
        <PhotoTrigger index={lightboxIndex} ariaLabel={name} className="absolute inset-0 z-[1] cursor-zoom-in" />
      )}
      <div className="pointer-events-none relative z-10">
        <span className="mb-1.5 inline-block rounded-full bg-aegean/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {tag}
        </span>
        <h1 className="font-heading text-2xl font-bold leading-tight text-white md:text-3xl">
          {name}
        </h1>
      </div>
    </div>
  );
}
