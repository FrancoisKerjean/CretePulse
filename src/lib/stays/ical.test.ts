import { describe, it, expect } from "vitest";
import { parseICalText, buildIcalExport } from "./ical";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260701",
  "DTEND;VALUE=DATE:20260708",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseICalText", () => {
  it("extracts date ranges as YYYY-MM-DD", () => {
    const events = parseICalText(ICS);
    expect(events).toEqual([{ dateFrom: "2026-07-01", dateTo: "2026-07-08" }]);
  });
  it("returns [] on empty input", () => {
    expect(parseICalText("")).toEqual([]);
  });
});

describe("buildIcalExport", () => {
  it("emits one VEVENT per booked range", () => {
    const ics = buildIcalExport("villa-makrigialos", [
      { dateFrom: "2026-07-01", dateTo: "2026-07-08" },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260701");
    expect(ics).toContain("DTEND;VALUE=DATE:20260708");
    expect(ics).toContain("END:VCALENDAR");
  });
});
