import type { MonthlyClimate } from "./weather-monthly";

type Bucket = "coldest" | "cool" | "mild" | "hot" | "peak";

function bucketOf(current: number, annual: number): Bucket {
  const delta = current - annual;
  if (delta >= 7) return "peak";
  if (delta >= 3) return "hot";
  if (delta >= -2) return "mild";
  if (delta >= -5) return "cool";
  return "coldest";
}

type Ctx = {
  cityName: string;
  // Locative form used only by the Greek template. Callers building an
  // insight for locale=el should pass the properly-declined form with
  // its preposition (e.g. "στα Χανιά", "στην Ιεράπετρα"); ignored elsewhere.
  cityLocativeEl?: string;
  monthName: string;
  climate: MonthlyClimate;
  annual: MonthlyClimate;
  bucket: Bucket;
  deltaHigh: number;
};

// Templates match the /airbnb insight pattern: one temperature-anchored
// sentence + one companion fact (sea + rain). Zero fabrication — every
// number comes from BASE_CLIMATE via getClimateData / getAnnualAverage.
// Bucket thresholds are calibrated on the actual Cretan climate spread
// (annual mean ~22°C, monthly range 15-34°C).

function en(c: Ctx): string {
  const swim = c.climate.seaTemp >= 22 ? "warm enough for swimming" : c.climate.seaTemp >= 19 ? "swimmable if you don't mind a fresh dip" : "too cool for swimming";
  const rain = c.climate.rainyDays <= 1 ? "with virtually no rain" : c.climate.rainyDays <= 4 ? `with ${c.climate.rainyDays} rainy days` : `with ${c.climate.rainyDays} rainy days on average`;
  const lead = {
    peak:    `${c.monthName} is the hottest stretch of the year in ${c.cityName}, peaking at ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C above its annual average of ${Math.round(c.annual.avgHigh)}°C.`,
    hot:     `In ${c.monthName}, ${c.cityName} runs ${Math.round(c.deltaHigh)}°C above its annual average, at ${c.climate.avgHigh}°C during the day.`,
    mild:    `${c.monthName} sits close to ${c.cityName}'s annual average of ${Math.round(c.annual.avgHigh)}°C, with daytime highs around ${c.climate.avgHigh}°C.`,
    cool:    `${c.monthName} is a cooler month in ${c.cityName} at ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C below its annual average.`,
    coldest: `${c.monthName} is one of the coldest months in ${c.cityName}, averaging just ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C below the annual mean.`,
  }[c.bucket];
  return `${lead} The sea sits at ${c.climate.seaTemp}°C — ${swim} — ${rain}.`;
}

function fr(c: Ctx): string {
  const swim = c.climate.seaTemp >= 22 ? "confortable pour la baignade" : c.climate.seaTemp >= 19 ? "baignable si vous supportez la fraîcheur" : "trop froide pour la baignade";
  const rain = c.climate.rainyDays <= 1 ? "avec quasiment pas de pluie" : c.climate.rainyDays <= 4 ? `avec ${c.climate.rainyDays} jours de pluie` : `avec ${c.climate.rainyDays} jours de pluie en moyenne`;
  const lead = {
    peak:    `${c.monthName} est la période la plus chaude de l'année à ${c.cityName}, culminant à ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C au-dessus de sa moyenne annuelle de ${Math.round(c.annual.avgHigh)}°C.`,
    hot:     `En ${c.monthName}, ${c.cityName} affiche ${Math.round(c.deltaHigh)}°C au-dessus de sa moyenne annuelle, avec ${c.climate.avgHigh}°C en journée.`,
    mild:    `${c.monthName} se situe autour de la moyenne annuelle de ${c.cityName} (${Math.round(c.annual.avgHigh)}°C), avec des températures de ${c.climate.avgHigh}°C en journée.`,
    cool:    `${c.monthName} est un mois plus frais à ${c.cityName}, avec ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C sous sa moyenne annuelle.`,
    coldest: `${c.monthName} est l'un des mois les plus froids à ${c.cityName}, avec ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C sous la moyenne annuelle.`,
  }[c.bucket];
  return `${lead} La mer est à ${c.climate.seaTemp}°C — ${swim} — ${rain}.`;
}

function de(c: Ctx): string {
  const swim = c.climate.seaTemp >= 22 ? "angenehm zum Schwimmen" : c.climate.seaTemp >= 19 ? "badbar, wenn Sie frische Wassertemperaturen mögen" : "zu kalt zum Schwimmen";
  const rain = c.climate.rainyDays <= 1 ? "praktisch ohne Regen" : c.climate.rainyDays <= 4 ? `mit ${c.climate.rainyDays} Regentagen` : `mit durchschnittlich ${c.climate.rainyDays} Regentagen`;
  const lead = {
    peak:    `${c.monthName} ist die heißeste Zeit des Jahres in ${c.cityName} und erreicht ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C über dem Jahresmittel von ${Math.round(c.annual.avgHigh)}°C.`,
    hot:     `Im ${c.monthName} liegt ${c.cityName} ${Math.round(c.deltaHigh)}°C über seinem Jahresdurchschnitt, mit Tageshöchstwerten um ${c.climate.avgHigh}°C.`,
    mild:    `${c.monthName} liegt nahe am Jahresmittel von ${c.cityName} (${Math.round(c.annual.avgHigh)}°C), mit Tageswerten um ${c.climate.avgHigh}°C.`,
    cool:    `${c.monthName} ist ein kühlerer Monat in ${c.cityName} mit ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C unter dem Jahresmittel.`,
    coldest: `${c.monthName} zählt zu den kältesten Monaten in ${c.cityName} mit nur ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C unter dem Jahresmittel.`,
  }[c.bucket];
  return `${lead} Das Meer hat ${c.climate.seaTemp}°C — ${swim} — ${rain}.`;
}

function el(c: Ctx): string {
  const swim = c.climate.seaTemp >= 22 ? "ιδανική για κολύμπι" : c.climate.seaTemp >= 19 ? "κολυμπήσιμη αν αντέχετε την δροσιά" : "πολύ κρύα για κολύμπι";
  const rain = c.climate.rainyDays <= 1 ? "χωρίς σχεδόν καθόλου βροχή" : c.climate.rainyDays <= 4 ? `με ${c.climate.rainyDays} βροχερές ημέρες` : `με ${c.climate.rainyDays} βροχερές ημέρες κατά μέσο όρο`;
  const lead = {
    peak:    `${c.monthName} είναι η πιο ζεστή περίοδος του χρόνου ${c.cityLocativeEl ?? "στην " + c.cityName}, φτάνοντας τους ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C πάνω από τον ετήσιο μέσο όρο των ${Math.round(c.annual.avgHigh)}°C.`,
    hot:     `Τον ${c.monthName}, ${c.cityLocativeEl ?? "στην " + c.cityName} η θερμοκρασία είναι ${Math.round(c.deltaHigh)}°C πάνω από τον ετήσιο μέσο όρο, με ${c.climate.avgHigh}°C την ημέρα.`,
    mild:    `${c.monthName} βρίσκεται κοντά στον ετήσιο μέσο όρο ${c.cityLocativeEl ?? "στην " + c.cityName} (${Math.round(c.annual.avgHigh)}°C), με θερμοκρασίες περίπου ${c.climate.avgHigh}°C.`,
    cool:    `${c.monthName} είναι πιο δροσερός μήνας ${c.cityLocativeEl ?? "στην " + c.cityName} με ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C κάτω από τον ετήσιο μέσο όρο.`,
    coldest: `${c.monthName} είναι από τους πιο κρύους μήνες ${c.cityLocativeEl ?? "στην " + c.cityName} με μόλις ${c.climate.avgHigh}°C — ${Math.round(Math.abs(c.deltaHigh))}°C κάτω από τον ετήσιο μέσο όρο.`,
  }[c.bucket];
  return `${lead} Η θάλασσα είναι στους ${c.climate.seaTemp}°C — ${swim} — ${rain}.`;
}

/**
 * Data-driven single-paragraph insight about how a given month compares
 * to the city's own annual baseline. 100% calculated: nothing is invented.
 * Returns EN for locales that don't have a template.
 */
export function weatherInsight(
  cityName: string,
  monthName: string,
  climate: MonthlyClimate,
  annual: MonthlyClimate,
  locale: string,
  cityLocativeEl?: string,
): string {
  const deltaHigh = Math.round((climate.avgHigh - annual.avgHigh) * 10) / 10;
  const ctx: Ctx = {
    cityName,
    cityLocativeEl,
    monthName,
    climate,
    annual,
    bucket: bucketOf(climate.avgHigh, annual.avgHigh),
    deltaHigh,
  };
  switch (locale) {
    case "fr": return fr(ctx);
    case "de": return de(ctx);
    case "el": return el(ctx);
    default:   return en(ctx);
  }
}
