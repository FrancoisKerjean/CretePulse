// src/lib/passive-position.ts : position passive stricte. Ne demande JAMAIS
// la permission géoloc : lit la position uniquement si déjà accordée
// (permissions.state === "granted"), sinon résout null. Distance au plus
// proche arrêt via /api/buses/nearest-stop (endpoint NowPanel existant).
// RGPD : jamais de prompt, position jamais stockée ni transmise à Plausible.
export async function passiveNearestStopKm(timeoutMs = 3000): Promise<number | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return null;
    const st = await navigator.permissions.query({ name: "geolocation" });
    if (st.state !== "granted") return null;
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      const t = setTimeout(() => resolve(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (p) => { clearTimeout(t); resolve(p); },
        () => { clearTimeout(t); resolve(null); },
        { maximumAge: 120_000, timeout: timeoutMs },
      );
    });
    if (!pos) return null;
    const res = await fetch(
      `/api/buses/nearest-stop?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { stop: { km: number } | null };
    return data.stop?.km ?? null;
  } catch {
    return null;
  }
}
