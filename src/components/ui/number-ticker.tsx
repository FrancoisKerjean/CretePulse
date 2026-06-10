"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}

/**
 * SSR-safe count-up. The server (and any client before hydration/JS) renders the
 * final value directly, so bots, slow connections and full-page screenshots never
 * see "0". The count-up animation is a progressive enhancement: once the element
 * scrolls into view on the client, it restarts from 0 and animates to the value.
 */
export function NumberTicker({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1.5,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  // Initial state = final value: SSR HTML and the no-JS fallback show the real number.
  const [count, setCount] = useState(value);

  useEffect(() => {
    if (!isInView) return;

    const end = value;
    const totalFrames = Math.round(duration * 60);
    const increment = end / totalFrames;
    let current = 0;

    // Restart from 0 only once the animation is actually about to run.
    setCount(0);

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{count}{suffix}
    </span>
  );
}
