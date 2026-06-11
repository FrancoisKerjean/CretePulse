import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Temporary diagnostic endpoint: raw result of the cb_places bounding-box
// query as executed from the Vercel runtime. Remove once the beach FAQ
// data path is confirmed in production.

export const dynamic = "force-dynamic";

export async function GET() {
  const lat = 35.4061962;
  const lng = 25.0186883;
  const t0 = Date.now();
  try {
    const { data, error } = await supabase
      .from("cb_places")
      .select("slug, latitude, longitude, sea_surface, sand_type")
      .eq("place_type", "beach")
      .gte("latitude", lat - 0.02)
      .lte("latitude", lat + 0.02)
      .gte("longitude", lng - 0.02)
      .lte("longitude", lng + 0.02)
      .limit(20);
    return NextResponse.json({
      ms: Date.now() - t0,
      error: error ? JSON.parse(JSON.stringify(error)) : null,
      count: data?.length ?? 0,
      first: data?.[0] ?? null,
      env: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (e) {
    return NextResponse.json({
      ms: Date.now() - t0,
      threw: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      env: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }
}
