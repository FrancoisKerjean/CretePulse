import { describe, it, expect } from "vitest";
import {
  aggregateWeek,
  buildNewsletterDigest,
  digestHasContent,
  normalizeLang,
  type NewsletterLang,
} from "./newsletter";
import type { CityWeather } from "./weather";
import type { Beach, Event } from "./types";
import type { ScoredBeach, SwimToday } from "./swim-today";

function beach(slug: string, region: Beach["region"] = "east"): Beach {
  return {
    id: 1,
    slug,
    name_en: `${slug} EN`,
    name_fr: `${slug} FR`,
    name_de: `${slug} DE`,
    name_el: `${slug} EL`,
    latitude: 35,
    longitude: 25,
    region,
    type: "sand",
    length_m: null,
    parking: false,
    sunbeds: false,
    taverna: false,
  } as Beach;
}

function scored(slug: string, rating: ScoredBeach["rating"], seaTemp = 24): ScoredBeach {
  return {
    beach: beach(slug),
    score: rating === "calm" ? 80 : rating === "fair" ? 60 : 30,
    rating,
    shoreWind: "offshore",
    facing: 180,
    city: {} as ScoredBeach["city"],
    cityKm: 5,
    windSpeed: 10,
    windCardinal: "N",
    waveHeight: 0.2,
    seaTemp,
    busStop: null,
    cb: null,
    imageUrl: null,
  };
}

function swim(pick: ScoredBeach, rest: ScoredBeach[]): SwimToday {
  return {
    pick,
    byRegion: {},
    avoid: [],
    cities: [
      { name: "Chania", nameEl: "", lat: 35, lng: 24, temp: 30, windSpeed: 12, windDir: 0, weatherCode: 1, seaTemp: 25, waveHeight: 0.2,
        daily: [
          { date: "2026-07-21", weatherCode: 0, tempMax: 30, tempMin: 22, precipProb: 0 },
          { date: "2026-07-22", weatherCode: 61, tempMax: 27, tempMin: 21, precipProb: 40 },
        ] },
      { name: "Sitia", nameEl: "", lat: 35, lng: 26, temp: 31, windSpeed: 15, windDir: 0, weatherCode: 1, seaTemp: 26, waveHeight: 0.3,
        daily: [
          { date: "2026-07-21", weatherCode: 0, tempMax: 33, tempMin: 24, precipProb: 10 },
          { date: "2026-07-22", weatherCode: 1, tempMax: 29, tempMin: 22, precipProb: 20 },
        ] },
    ] as SwimToday["cities"],
    wind: { cardinal: "N", minSpeed: 12, maxSpeed: 15 },
    scored: [pick, ...rest],
  };
}

function ev(slug: string, date_start: string, verified = true): Event {
  return {
    id: 1,
    slug,
    title_en: `${slug} EN`,
    title_fr: `${slug} FR`,
    title_de: `${slug} DE`,
    title_el: `${slug} EL`,
    description_en: "",
    description_fr: "",
    description_de: "",
    description_el: "",
    date_start,
    date_end: null,
    time_start: null,
    location_name: "Heraklion",
    latitude: null,
    longitude: null,
    region: "central",
    category: "festival",
    source_url: null,
    verified,
  };
}

const WEEK = "2026-07-20"; // a Monday

describe("buildNewsletterDigest", () => {
  it("keeps only events within the next 7 days", () => {
    const events = [
      ev("past", "2026-07-19"), // day before -> excluded
      ev("today", "2026-07-20"),
      ev("d7", "2026-07-27"), // inclusive boundary
      ev("d8", "2026-07-28"), // out of window
    ];
    const d = buildNewsletterDigest(null, events, "en", WEEK);
    expect(d.events.map((e) => e.slug)).toEqual(["today", "d7"]);
  });

  it("excludes unverified events", () => {
    const events = [ev("draft", "2026-07-21", false), ev("live", "2026-07-21", true)];
    const d = buildNewsletterDigest(null, events, "en", WEEK);
    expect(d.events.map((e) => e.slug)).toEqual(["live"]);
  });

  it("localizes event titles", () => {
    const d = buildNewsletterDigest(null, [ev("x", "2026-07-21")], "fr", WEEK);
    expect(d.events[0].title).toBe("x FR");
  });

  it("caps the number of events", () => {
    const events = Array.from({ length: 9 }, (_, i) => ev(`e${i}`, "2026-07-21"));
    const d = buildNewsletterDigest(null, events, "en", WEEK, { maxEvents: 3 });
    expect(d.events).toHaveLength(3);
  });

  it("selects calm beaches excluding the hero pick", () => {
    const pick = scored("hero", "calm");
    const rest = [scored("calm1", "calm"), scored("fair1", "fair"), scored("calm2", "calm")];
    const d = buildNewsletterDigest(swim(pick, rest), [], "en", WEEK);
    expect(d.swimPick?.slug).toBe("hero");
    expect(d.calmBeaches.map((b) => b.slug)).toEqual(["calm1", "calm2"]);
  });

  it("localizes beach names in the pick", () => {
    const d = buildNewsletterDigest(swim(scored("hero", "calm"), []), [], "de", WEEK);
    expect(d.swimPick?.name).toBe("hero DE");
  });

  it("reports the warmest sea among cities", () => {
    const d = buildNewsletterDigest(swim(scored("hero", "calm"), []), [], "en", WEEK);
    expect(d.warmestSea).toEqual({ name: "Sitia", seaTemp: 26 });
    expect(d.cityCount).toBe(2);
  });

  it("builds an island week strip from the city forecasts", () => {
    const d = buildNewsletterDigest(swim(scored("hero", "calm"), []), [], "en", WEEK);
    expect(d.week).toHaveLength(2);
    // day 1: island high = max(30,33)=33, low = min(22,24)=22, both clear -> code 0, rain max(0,10)=10
    expect(d.week[0]).toEqual({ date: "2026-07-21", weatherCode: 0, tempMax: 33, tempMin: 22, precipProb: 10 });
    // day 2: high max(27,29)=29, low min(21,22)=21, rain max(40,20)=40
    expect(d.week[1].tempMax).toBe(29);
    expect(d.week[1].precipProb).toBe(40);
  });

  it("handles no swim data gracefully", () => {
    const d = buildNewsletterDigest(null, [ev("x", "2026-07-21")], "en", WEEK);
    expect(d.swimPick).toBeNull();
    expect(d.calmBeaches).toEqual([]);
    expect(d.week).toEqual([]);
    expect(d.wind).toBeNull();
    expect(d.warmestSea).toBeNull();
  });
});

describe("aggregateWeek", () => {
  function city(daily: CityWeather["daily"]): CityWeather {
    return { name: "X", nameEl: "", lat: 35, lng: 25, temp: 30, windSpeed: 10, windDir: 0, weatherCode: 0, seaTemp: 25, waveHeight: 0.2, daily } as CityWeather;
  }
  it("returns [] when no city has a forecast", () => {
    expect(aggregateWeek([city([])])).toEqual([]);
  });
  it("orders days and picks the most common sky", () => {
    const days = aggregateWeek([
      city([{ date: "2026-08-02", weatherCode: 3, tempMax: 28, tempMin: 20, precipProb: 30 }]),
      city([{ date: "2026-08-01", weatherCode: 0, tempMax: 31, tempMin: 22, precipProb: 5 }]),
      city([{ date: "2026-08-01", weatherCode: 0, tempMax: 33, tempMin: 24, precipProb: 15 }]),
    ]);
    expect(days.map((d) => d.date)).toEqual(["2026-08-01", "2026-08-02"]);
    expect(days[0]).toEqual({ date: "2026-08-01", weatherCode: 0, tempMax: 33, tempMin: 22, precipProb: 15 });
  });
});

describe("digestHasContent", () => {
  it("is false when there is neither a swim pick nor events", () => {
    expect(digestHasContent(buildNewsletterDigest(null, [], "en", WEEK))).toBe(false);
  });
  it("is true with at least one event", () => {
    expect(digestHasContent(buildNewsletterDigest(null, [ev("x", "2026-07-21")], "en", WEEK))).toBe(true);
  });
});

describe("normalizeLang", () => {
  it("passes through supported langs", () => {
    for (const l of ["en", "fr", "de", "el"] as NewsletterLang[]) {
      expect(normalizeLang(l)).toBe(l);
    }
  });
  it("falls back to en", () => {
    expect(normalizeLang("es")).toBe("en");
    expect(normalizeLang(null)).toBe("en");
  });
});
