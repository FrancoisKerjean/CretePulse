import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const REQUIRED_FIELDS = ["title", "date", "location"] as const;

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) +
    "-" +
    Date.now().toString(36)
  );
}

export async function POST(request: NextRequest) {
  // IP-based rate limit: max 3 submissions per hour
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("submitter_ip", ip)
    .gte("created_at", oneHourAgo);

  if (typeof count === "number" && count >= 3) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot check
  if (body.website && String(body.website).trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    const val = body[field];
    if (!val || typeof val !== "string" || val.trim() === "") {
      return NextResponse.json(
        { error: `Field "${field}" is required` },
        { status: 422 }
      );
    }
  }

  const title = String(body.title).trim();
  const date = String(body.date).trim();
  const location = String(body.location).trim();
  const time = body.time ? String(body.time).trim() : null;
  const description = body.description ? String(body.description).trim().slice(0, 2000) : null;
  const email = body.email ? String(body.email).trim().toLowerCase() : null;

  // Basic date validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Date must be in YYYY-MM-DD format" },
      { status: 422 }
    );
  }

  const slug = generateSlug(title);

  const { error } = await supabase.from("events").insert({
    slug,
    title_en: title,
    title_fr: title,
    title_de: title,
    title_el: title,
    description_en: description ?? "",
    description_fr: description ?? "",
    description_de: description ?? "",
    description_el: description ?? "",
    date_start: date,
    date_end: null,
    time_start: time,
    location_name: location,
    latitude: null,
    longitude: null,
    region: null,
    category: "cultural",
    source_url: null,
    verified: false,
    submitter_email: email,
    submitter_ip: ip,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[submit-event] Supabase error:", error.message);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
