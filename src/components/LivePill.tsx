"use client";
// Pastille LIVE + heure Athens dans la nav (remplace le bandeau LiveBar).
import { useEffect, useState } from "react";

export function LivePill() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens",
    }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-sun text-text font-heading font-bold text-[13px] px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-[#0E9F5C]" />
      LIVE{time ? ` ${time}` : ""}
    </span>
  );
}
