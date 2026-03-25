"use client";

import { cn } from "@/lib/utils";
import { type ComponentPropsWithoutRef } from "react";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  pauseOnHover?: boolean;
  reverse?: boolean;
  duration?: number;
}

export function Marquee({
  children,
  className,
  pauseOnHover = true,
  reverse = false,
  duration = 30,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn("group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]", className)}
      style={{ "--duration": `${duration}s` } as React.CSSProperties}
      {...props}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-around gap-[var(--gap)] [animation:marquee_var(--duration)_linear_infinite]",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center justify-around gap-[var(--gap)] [animation:marquee_var(--duration)_linear_infinite]",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden
      >
        {children}
      </div>
    </div>
  );
}
