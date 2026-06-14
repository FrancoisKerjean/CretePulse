import Image from "next/image";

export function PhotoCell({
  src, alt, className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-sand-warm ${className}`}>
      <Image src={src} alt={alt} fill loading="lazy" sizes="(max-width:768px) 50vw, 33vw" className="object-cover" />
    </div>
  );
}
