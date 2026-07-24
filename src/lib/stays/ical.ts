export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

function toIso(yyyymmdd: string): string | null {
  const m = yyyymmdd.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function fieldFromBlock(block: string, field: string): string | null {
  const re = new RegExp(`${field}[^:]*:([^\\r\\n]+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

export function parseICalText(text: string): DateRange[] {
  if (!text) return [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  const out: DateRange[] = [];
  for (const raw of blocks) {
    const block = raw.split("END:VEVENT")[0];
    const start = fieldFromBlock(block, "DTSTART");
    const end = fieldFromBlock(block, "DTEND");
    const dateFrom = start ? toIso(start) : null;
    const dateTo = end ? toIso(end) : null;
    if (dateFrom && dateTo) out.push({ dateFrom, dateTo });
  }
  return out;
}

const compact = (iso: string) => iso.replace(/-/g, "");

export function buildIcalExport(slug: string, ranges: DateRange[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//crete.direct//stays//EN",
    "CALSCALE:GREGORIAN",
  ];
  ranges.forEach((r, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${slug}-${i}@crete.direct`,
      `DTSTART;VALUE=DATE:${compact(r.dateFrom)}`,
      `DTEND;VALUE=DATE:${compact(r.dateTo)}`,
      "SUMMARY:Not available (crete.direct)",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
