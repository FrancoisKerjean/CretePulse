// Sanity du réseau bus après build : invariants structurels lus en PostgREST.
// Run: node scripts/check-bus-network.mjs   (lit NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) { console.error("missing supabase env"); process.exit(1); }

const rest = (t, q = "") =>
  fetch(`${URL}/rest/v1/${t}?${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    .then((r) => r.json());

const fail = (m) => { console.error("FAIL:", m); process.exitCode = 1; };

const [stops, lines, ls] = await Promise.all([
  rest("bus_stops", "select=id,slug,lat,lng,coords_source"),
  rest("bus_lines", "select=id,code,total_minutes"),
  rest("bus_line_stops", "select=line_id,seq,cumulative_minutes&order=line_id,seq"),
]);

if (stops.length < 20) fail(`only ${stops.length} stops`);
if (lines.length < 5) fail(`only ${lines.length} lines`);
if (new Set(lines.map((l) => l.code)).size !== lines.length) fail("duplicate line codes");

const geocoded = stops.filter((s) => s.lat != null).length;
console.log(`stops: ${stops.length} (${geocoded} géocodés), lines: ${lines.length}, line_stops: ${ls.length}`);

const byLine = new Map();
for (const x of ls) { if (!byLine.has(x.line_id)) byLine.set(x.line_id, []); byLine.get(x.line_id).push(x); }
for (const [lid, seq] of byLine) {
  for (let i = 0; i < seq.length; i++) {
    if (seq[i].seq !== i) fail(`line ${lid}: seq non contigu à ${i}`);
    if (i > 0 && seq[i].cumulative_minutes < seq[i - 1].cumulative_minutes)
      fail(`line ${lid}: cumulative_minutes décroissant`);
  }
  if (seq.length < 2) fail(`line ${lid}: < 2 arrêts`);
}
if (!process.exitCode) console.log("OK invariants réseau");
