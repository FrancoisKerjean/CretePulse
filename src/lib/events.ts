import { supabase } from "./supabase";
import type { Event } from "./types";

export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("events")
    .select("slug, title_en, title_fr, title_de, title_el, date_start, date_end, time_start, location_name, category, region")
    .gte("date_start", today)
    .eq("verified", true)
    .order("date_start");

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) throw error;
  return (data as Event[]) || [];
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Event;
}

export async function getEventsByCategory(category: string): Promise<Event[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("events")
    .select("slug, title_en, title_fr, title_de, title_el, date_start, date_end, time_start, location_name, category, region")
    .gte("date_start", today)
    .eq("category", category)
    .eq("verified", true)
    .order("date_start");

  if (error) return [];
  return (data as Event[]) || [];
}

/**
 * Group events by ISO week string (YYYY-Www) for calendar-style display.
 */
export function groupEventsByWeek(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();

  for (const event of events) {
    const date = new Date(event.date_start);
    // Get Monday of the week
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const key = monday.toISOString().split("T")[0];

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }

  return map;
}
