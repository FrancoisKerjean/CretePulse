"use client";

import { useState } from "react";
import { Waves } from "lucide-react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

// Renders a beach image with a graceful gradient fallback when the URL is
// missing or fails to load. The Wikipedia Commons scraper occasionally
// returns broken or unrelated assets, so we never trust the URL blindly.
export function BeachImage({ src, alt, className }: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className ?? ""} flex items-center justify-center bg-gradient-to-br from-sea-faint via-sea/20 to-sea/40`}
      >
        <Waves className="w-10 h-10 text-sea/60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
