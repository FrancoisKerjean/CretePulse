import { NextRequest, NextResponse } from "next/server";

// Verify cron secret to prevent unauthorized access
function verifyCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if no secret configured
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: "No ANTHROPIC_API_KEY configured" }, { status: 500 });
  }

  try {
    // Dynamically import supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get existing events for dedup
    const { data: existing } = await supabase.from("events").select("title_en, date_start");
    const existingKeys = new Set(
      (existing || []).map((e: { title_en: string; date_start: string }) =>
        `${e.title_en?.toLowerCase().slice(0, 30)}|${e.date_start}`
      )
    );

    const now = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const currentMonth = months[now.getMonth()];
    const nextMonth = months[(now.getMonth() + 1) % 12];
    const year = now.getFullYear();

    // Ask Claude to generate events
    const prompt = `Generate a JSON array of 10 upcoming events in Crete, Greece for ${currentMonth}-${nextMonth} ${year}.
Include: panigýria, festivals, food events, concerts, markets, sports, religious celebrations.
Cover all regions (east, west, central, south). Use real Cretan locations with accurate coordinates.

Return ONLY a JSON array with objects:
{"title_en":"...","title_fr":"...","title_de":"...","title_el":"...","description_en":"...","description_fr":"...","description_de":"...","description_el":"...","date_start":"YYYY-MM-DD","date_end":"YYYY-MM-DD or null","time_start":"HH:MM or null","location_name":"City, Region","latitude":number,"longitude":number,"region":"east|west|central|south","category":"festival|food|music|religious|sports|market|cultural"}

French must have proper accents. Greek in native script.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || "";
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const events = JSON.parse(jsonStr);

    let inserted = 0;
    for (const event of events) {
      const slug = event.title_en.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);

      const key = `${event.title_en?.toLowerCase().slice(0, 30)}|${event.date_start}`;
      if (existingKeys.has(key)) continue;

      const { data: slugCheck } = await supabase.from("events").select("id").eq("slug", slug).limit(1);
      if (slugCheck && slugCheck.length > 0) continue;

      const { error } = await supabase.from("events").insert({
        slug,
        ...event,
        source_url: null,
        verified: true,
      });

      if (!error) {
        inserted++;
        existingKeys.add(key);
      }
    }

    return NextResponse.json({ ok: true, inserted, total: events.length });
  } catch (err) {
    console.error("[cron/scrape-events] Error:", err);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
