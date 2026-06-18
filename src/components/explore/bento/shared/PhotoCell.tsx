import Image from "next/image";
import { PhotoTrigger } from "@/components/explore/PhotoLightbox";

export function PhotoCell({
  src, alt, className = "", lightboxIndex,
}: {
  src: string;
  alt: string;
  className?: string;
  lightboxIndex?: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-sand-warm ${className}`}>
      <Image src={src} alt={alt} fill loading="lazy" sizes="(max-width:768px) 50vw, 33vw" className="object-cover" />
      {lightboxIndex !== undefined && (
        <PhotoTrigger index={lightboxIndex} ariaLabel={alt} className="absolute inset-0 z-[1] cursor-zoom-in" />
      )}
    </div>
  );
}
