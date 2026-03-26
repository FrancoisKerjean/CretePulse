export interface MonthlyClimate {
  avgHigh: number;
  avgLow: number;
  seaTemp: number;
  rainyDays: number;
  sunHours: number;
  uvIndex: number;
}

export const CITIES = [
  { slug: "heraklion", name: "Heraklion", nameEl: "Ηράκλειο", lat: 35.34, lng: 25.13 },
  { slug: "chania", name: "Chania", nameEl: "Χανιά", lat: 35.51, lng: 24.02 },
  { slug: "rethymno", name: "Rethymno", nameEl: "Ρέθυμνο", lat: 35.37, lng: 24.47 },
  { slug: "agios-nikolaos", name: "Agios Nikolaos", nameEl: "Άγιος Νικόλαος", lat: 35.19, lng: 25.72 },
  { slug: "sitia", name: "Sitia", nameEl: "Σητεία", lat: 35.21, lng: 26.10 },
  { slug: "ierapetra", name: "Ierapetra", nameEl: "Ιεράπετρα", lat: 35.01, lng: 25.74 },
  { slug: "malia", name: "Malia", nameEl: "Μάλια", lat: 35.29, lng: 25.46 },
  { slug: "hersonissos", name: "Hersonissos", nameEl: "Χερσόνησος", lat: 35.31, lng: 25.39 },
  { slug: "elounda", name: "Elounda", nameEl: "Ελούντα", lat: 35.26, lng: 25.73 },
  { slug: "makrigialos", name: "Makrigialos", nameEl: "Μακρύγιαλος", lat: 35.04, lng: 25.98 },
] as const;

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

export const MONTH_NAMES: Record<string, Record<string, string>> = {
  en: { january: "January", february: "February", march: "March", april: "April", may: "May", june: "June", july: "July", august: "August", september: "September", october: "October", november: "November", december: "December" },
  fr: { january: "Janvier", february: "Février", march: "Mars", april: "Avril", may: "Mai", june: "Juin", july: "Juillet", august: "Août", september: "Septembre", october: "Octobre", november: "Novembre", december: "Décembre" },
  de: { january: "Januar", february: "Februar", march: "März", april: "April", may: "Mai", june: "Juni", july: "Juli", august: "August", september: "September", october: "Oktober", november: "November", december: "Dezember" },
  el: { january: "Ιανουάριος", february: "Φεβρουάριος", march: "Μάρτιος", april: "Απρίλιος", may: "Μάιος", june: "Ιούνιος", july: "Ιούλιος", august: "Αύγουστος", september: "Σεπτέμβριος", october: "Οκτώβριος", november: "Νοέμβριος", december: "Δεκέμβριος" },
  it: { january: "Gennaio", february: "Febbraio", march: "Marzo", april: "Aprile", may: "Maggio", june: "Giugno", july: "Luglio", august: "Agosto", september: "Settembre", october: "Ottobre", november: "Novembre", december: "Dicembre" },
  nl: { january: "Januari", february: "Februari", march: "Maart", april: "April", may: "Mei", june: "Juni", july: "Juli", august: "Augustus", september: "September", october: "Oktober", november: "November", december: "December" },
  pl: { january: "Styczeń", february: "Luty", march: "Marzec", april: "Kwiecień", may: "Maj", june: "Czerwiec", july: "Lipiec", august: "Sierpień", september: "Wrzesień", october: "Październik", november: "Listopad", december: "Grudzień" },
  es: { january: "Enero", february: "Febrero", march: "Marzo", april: "Abril", may: "Mayo", june: "Junio", july: "Julio", august: "Agosto", september: "Septiembre", october: "Octubre", november: "Noviembre", december: "Diciembre" },
  pt: { january: "Janeiro", february: "Fevereiro", march: "Março", april: "Abril", may: "Maio", june: "Junho", july: "Julho", august: "Agosto", september: "Setembro", october: "Outubro", november: "Novembro", december: "Dezembro" },
  ru: { january: "Январь", february: "Февраль", march: "Март", april: "Апрель", may: "Май", june: "Июнь", july: "Июль", august: "Август", september: "Сентябрь", october: "Октябрь", november: "Ноябрь", december: "Декабрь" },
  ja: { january: "1月", february: "2月", march: "3月", april: "4月", may: "5月", june: "6月", july: "7月", august: "8月", september: "9月", october: "10月", november: "11月", december: "12月" },
  ko: { january: "1월", february: "2월", march: "3월", april: "4월", may: "5월", june: "6월", july: "7월", august: "8월", september: "9월", october: "10월", november: "11월", december: "12월" },
  zh: { january: "一月", february: "二月", march: "三月", april: "四月", may: "五月", june: "六月", july: "七月", august: "八月", september: "九月", october: "十月", november: "十一月", december: "十二月" },
  tr: { january: "Ocak", february: "Şubat", march: "Mart", april: "Nisan", may: "Mayıs", june: "Haziran", july: "Temmuz", august: "Ağustos", september: "Eylül", october: "Ekim", november: "Kasım", december: "Aralık" },
  sv: { january: "Januari", february: "Februari", march: "Mars", april: "April", may: "Maj", june: "Juni", july: "Juli", august: "Augusti", september: "September", october: "Oktober", november: "November", december: "December" },
  da: { january: "Januar", february: "Februar", march: "Marts", april: "April", may: "Maj", june: "Juni", july: "Juli", august: "August", september: "September", october: "Oktober", november: "November", december: "December" },
  no: { january: "Januar", february: "Februar", march: "Mars", april: "April", may: "Mai", june: "Juni", july: "Juli", august: "August", september: "September", october: "Oktober", november: "November", december: "Desember" },
  fi: { january: "Tammikuu", february: "Helmikuu", march: "Maaliskuu", april: "Huhtikuu", may: "Toukokuu", june: "Kesäkuu", july: "Heinäkuu", august: "Elokuu", september: "Syyskuu", october: "Lokakuu", november: "Marraskuu", december: "Joulukuu" },
  cs: { january: "Leden", february: "Únor", march: "Březen", april: "Duben", may: "Květen", june: "Červen", july: "Červenec", august: "Srpen", september: "Září", october: "Říjen", november: "Listopad", december: "Prosinec" },
  hu: { january: "Január", february: "Február", march: "Március", april: "Április", may: "Május", june: "Június", july: "Július", august: "Augusztus", september: "Szeptember", october: "Október", november: "November", december: "December" },
  ro: { january: "Ianuarie", february: "Februarie", march: "Martie", april: "Aprilie", may: "Mai", june: "Iunie", july: "Iulie", august: "August", september: "Septembrie", october: "Octombrie", november: "Noiembrie", december: "Decembrie" },
  ar: { january: "يناير", february: "فبراير", march: "مارس", april: "أبريل", may: "مايو", june: "يونيو", july: "يوليو", august: "أغسطس", september: "سبتمبر", october: "أكتوبر", november: "نوفمبر", december: "ديسمبر" },
};

// Historical monthly climate data (averaged across east Crete)
// Source: climate-data.org, weatherspark.com, open-meteo historical
const BASE_CLIMATE: Record<string, MonthlyClimate> = {
  january:   { avgHigh: 15, avgLow: 8,  seaTemp: 16, rainyDays: 10, sunHours: 4, uvIndex: 2 },
  february:  { avgHigh: 15, avgLow: 8,  seaTemp: 15, rainyDays: 8,  sunHours: 5, uvIndex: 3 },
  march:     { avgHigh: 17, avgLow: 9,  seaTemp: 16, rainyDays: 6,  sunHours: 6, uvIndex: 4 },
  april:     { avgHigh: 20, avgLow: 12, seaTemp: 17, rainyDays: 4,  sunHours: 8, uvIndex: 6 },
  may:       { avgHigh: 25, avgLow: 16, seaTemp: 20, rainyDays: 2,  sunHours: 10, uvIndex: 8 },
  june:      { avgHigh: 30, avgLow: 20, seaTemp: 23, rainyDays: 1,  sunHours: 12, uvIndex: 10 },
  july:      { avgHigh: 33, avgLow: 23, seaTemp: 25, rainyDays: 0,  sunHours: 13, uvIndex: 11 },
  august:    { avgHigh: 33, avgLow: 23, seaTemp: 26, rainyDays: 0,  sunHours: 12, uvIndex: 10 },
  september: { avgHigh: 29, avgLow: 20, seaTemp: 25, rainyDays: 1,  sunHours: 10, uvIndex: 7 },
  october:   { avgHigh: 24, avgLow: 16, seaTemp: 23, rainyDays: 5,  sunHours: 7, uvIndex: 4 },
  november:  { avgHigh: 20, avgLow: 13, seaTemp: 20, rainyDays: 7,  sunHours: 5, uvIndex: 3 },
  december:  { avgHigh: 16, avgLow: 9,  seaTemp: 17, rainyDays: 10, sunHours: 4, uvIndex: 2 },
};

export function getClimateData(citySlug: string, month: string): MonthlyClimate {
  const base = BASE_CLIMATE[month];
  if (!base) return BASE_CLIMATE.january;

  // Slight variations by city (south coast warmer, west coast more rain)
  const city = CITIES.find(c => c.slug === citySlug);
  if (!city) return base;

  const southBonus = city.lat < 35.1 ? 1 : 0; // Ierapetra, Makrigialos
  const westRainBonus = city.lng < 24.5 ? 2 : 0; // Chania, Rethymno

  return {
    avgHigh: base.avgHigh + southBonus,
    avgLow: base.avgLow + southBonus,
    seaTemp: base.seaTemp + southBonus,
    rainyDays: base.rainyDays + westRainBonus,
    sunHours: base.sunHours,
    uvIndex: base.uvIndex,
  };
}

export function getCity(slug: string) {
  return CITIES.find(c => c.slug === slug);
}

export function getSwimVerdict(seaTemp: number, locale: string): string {
  if (seaTemp >= 24) return locale === "fr" ? "Idéale pour la baignade" : locale === "de" ? "Ideal zum Schwimmen" : locale === "el" ? "Ιδανική για κολύμπι" : "Perfect for swimming";
  if (seaTemp >= 21) return locale === "fr" ? "Agréable pour la baignade" : locale === "de" ? "Angenehm zum Schwimmen" : locale === "el" ? "Ευχάριστη για κολύμπι" : "Pleasant for swimming";
  if (seaTemp >= 18) return locale === "fr" ? "Fraîche mais baignable" : locale === "de" ? "Kühl aber schwimmbar" : locale === "el" ? "Δροσερή αλλά κολυμπήσιμη" : "Cool but swimmable";
  return locale === "fr" ? "Trop froide pour la baignade" : locale === "de" ? "Zu kalt zum Schwimmen" : locale === "el" ? "Πολύ κρύα για κολύμπι" : "Too cold for swimming";
}
