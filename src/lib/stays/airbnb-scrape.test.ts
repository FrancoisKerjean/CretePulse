import { describe, it, expect } from "vitest";
import { airbnbIdFromUrl, parseAirbnbListing, scrapeAirbnbUrl } from "./airbnb-scrape";

const HTML = `
<html><head>
<meta property="og:title" content="Sea view villa in Makrigialos" />
<meta property="og:description" content="Cosy 2-bedroom villa with pool" />
<meta property="og:image" content="https://a0.example.com/pic1.jpg" />
<meta property="og:image" content="https://a0.example.com/pic2.jpg" />
</head><body></body></html>`;

describe("airbnbIdFromUrl", () => {
  it("extracts numeric id from /rooms/", () => {
    expect(airbnbIdFromUrl("https://www.airbnb.com/rooms/12345678?x=1")).toBe("12345678");
  });
  it("returns null when absent", () => {
    expect(airbnbIdFromUrl("https://example.com/nope")).toBeNull();
  });
});

describe("parseAirbnbListing", () => {
  it("pulls title, description and photos from OG tags", () => {
    const r = parseAirbnbListing(HTML);
    expect(r.title).toBe("Sea view villa in Makrigialos");
    expect(r.description).toBe("Cosy 2-bedroom villa with pool");
    expect(r.photos).toEqual([
      "https://a0.example.com/pic1.jpg",
      "https://a0.example.com/pic2.jpg",
    ]);
  });
  it("returns empty partial on junk without throwing", () => {
    expect(parseAirbnbListing("<html></html>").photos).toEqual([]);
  });
});

describe("scrapeAirbnbUrl", () => {
  it("returns ok=false but a usable partial when fetch fails", async () => {
    const failing = async () => { throw new Error("blocked"); };
    const r = await scrapeAirbnbUrl("https://www.airbnb.com/rooms/999", failing);
    expect(r.ok).toBe(false);
    expect(r.data.airbnbId).toBe("999");
  });
  it("parses when fetch returns HTML", async () => {
    const okFetch = async () => ({ ok: true, text: async () => HTML }) as unknown as Response;
    const r = await scrapeAirbnbUrl("https://www.airbnb.com/rooms/12345678", okFetch);
    expect(r.ok).toBe(true);
    expect(r.data.title).toBe("Sea view villa in Makrigialos");
    expect(r.data.airbnbId).toBe("12345678");
  });
});
