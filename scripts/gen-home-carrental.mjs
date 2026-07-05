// Jetable (Kami 04/07) : remplace l'encart home "match/Tinder" par "car rental"
// dans les 22 messages/*.json. Renomme les 4 clés home.match* -> home.carRental*
// (édition textuelle ligne à ligne, préserve le formatage du fichier).
// fr/en/de/el rédigés main ; autres alignés sur le wording validé de car-rental/content.ts.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "messages");

const T = {
  en: { kicker: "Car rental", title: "Your car to explore Crete", sub: "Local agency, fair price, no prepayment. Quote in 4 taps, airport pick-up possible.", cta: "Get a quote" },
  fr: { kicker: "Location de voiture", title: "Ta voiture pour explorer la Crète", sub: "Agence locale, prix juste, sans prépaiement. Devis en 4 clics, prise à l'aéroport possible.", cta: "Demander un devis" },
  de: { kicker: "Mietwagen", title: "Dein Auto, um Kreta zu entdecken", sub: "Lokale Agentur, fairer Preis, keine Vorauszahlung. Angebot in 4 Klicks, Abholung am Flughafen möglich.", cta: "Angebot anfordern" },
  el: { kicker: "Ενοικίαση αυτοκινήτου", title: "Το αυτοκίνητό σου για να εξερευνήσεις την Κρήτη", sub: "Τοπικό γραφείο, δίκαιη τιμή, χωρίς προπληρωμή. Προσφορά σε 4 κλικ, δυνατή παραλαβή στο αεροδρόμιο.", cta: "Ζήτησε προσφορά" },
  it: { kicker: "Noleggio auto", title: "La tua auto per esplorare Creta", sub: "Agenzia locale, prezzo onesto, nessun anticipo. Preventivo in 4 tap, ritiro in aeroporto possibile.", cta: "Richiedi un preventivo" },
  nl: { kicker: "Auto huren", title: "Jouw auto om Kreta te ontdekken", sub: "Lokaal bedrijf, eerlijke prijs, geen vooruitbetaling. Offerte in 4 tikken, ophalen op de luchthaven mogelijk.", cta: "Vraag een offerte" },
  pl: { kicker: "Wynajem samochodu", title: "Twoje auto, by zwiedzić Kretę", sub: "Lokalna firma, uczciwa cena, bez przedpłaty. Wycena w 4 kliknięcia, możliwy odbiór z lotniska.", cta: "Poproś o wycenę" },
  es: { kicker: "Alquiler de coches", title: "Tu coche para explorar Creta", sub: "Agencia local, precio justo, sin pago por adelantado. Presupuesto en 4 toques, recogida en el aeropuerto posible.", cta: "Pedir presupuesto" },
  pt: { kicker: "Aluguer de carros", title: "O teu carro para explorar Creta", sub: "Agência local, preço justo, sem pré-pagamento. Orçamento em 4 toques, recolha no aeroporto possível.", cta: "Pedir orçamento" },
  ru: { kicker: "Аренда авто", title: "Твоё авто, чтобы исследовать Крит", sub: "Местное агентство, честная цена, без предоплаты. Расчёт в 4 касания, возможна встреча в аэропорту.", cta: "Запросить расчёт" },
  zh: { kicker: "租车", title: "自驾探索克里特", sub: "本地租车行，价格公道，无需预付。四步获取报价，可机场取车。", cta: "获取报价" },
  tr: { kicker: "Araç kiralama", title: "Girit'i keşfetmek için aracın", sub: "Yerel acente, adil fiyat, ön ödeme yok. 4 dokunuşta teklif, havaalanında teslim mümkün.", cta: "Teklif al" },
  sv: { kicker: "Hyrbil", title: "Din bil för att utforska Kreta", sub: "Lokal byrå, rättvist pris, ingen förskottsbetalning. Offert på 4 tryck, upphämtning på flygplatsen möjlig.", cta: "Begär offert" },
  no: { kicker: "Leiebil", title: "Bilen din for å utforske Kreta", sub: "Lokalt byrå, rettferdig pris, ingen forhåndsbetaling. Tilbud på 4 trykk, henting på flyplassen mulig.", cta: "Be om tilbud" },
  ro: { kicker: "Închirieri auto", title: "Mașina ta pentru a explora Creta", sub: "Agenție locală, preț corect, fără plată în avans. Ofertă în 4 atingeri, preluare la aeroport posibilă.", cta: "Cere o ofertă" },
  fi: { kicker: "Auton vuokraus", title: "Autosi Kreetan tutkimiseen", sub: "Paikallinen toimisto, reilu hinta, ei ennakkomaksua. Tarjous 4 napautuksella, nouto lentokentältä mahdollista.", cta: "Pyydä tarjous" },
  ja: { kicker: "レンタカー", title: "クレタ島を巡るあなたの車", sub: "地元の代理店、公正な価格、前払い不要。4タップで見積もり、空港受け取り可能。", cta: "見積もりを取る" },
  ko: { kicker: "렌터카", title: "크레타를 탐험할 당신의 차", sub: "현지 업체, 공정한 가격, 선결제 없음. 4번의 탭으로 견적, 공항 픽업 가능.", cta: "견적 요청" },
  hu: { kicker: "Autóbérlés", title: "A te autód Kréta felfedezéséhez", sub: "Helyi iroda, tisztességes ár, előlegfizetés nélkül. Ajánlat 4 koppintással, reptéri átvétel lehetséges.", cta: "Kérj ajánlatot" },
  da: { kicker: "Lej en bil", title: "Din bil til at udforske Kreta", sub: "Lokalt bureau, fair pris, ingen forudbetaling. Tilbud på 4 tryk, afhentning i lufthavnen mulig.", cta: "Bed om tilbud" },
  cs: { kicker: "Půjčovna aut", title: "Tvé auto pro objevování Kréty", sub: "Místní agentura, férová cena, bez platby předem. Nabídka na 4 klepnutí, vyzvednutí na letišti možné.", cta: "Vyžádat nabídku" },
  ar: { kicker: "تأجير سيارات", title: "سيارتك لاستكشاف كريت", sub: "وكالة محلية، سعر عادل، بدون دفع مسبق. عرض سعر في 4 نقرات، الاستلام من المطار ممكن.", cta: "اطلب عرض سعر" },
};

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
let done = 0, skipped = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const loc = file.replace(/\.json$/, "");
  const tr = T[loc];
  if (!tr) { skipped.push(loc + " (no dict)"); continue; }
  const path = join(DIR, file);
  let raw = readFileSync(path, "utf8");
  if (!/"matchKicker"/.test(raw)) { skipped.push(loc + " (no matchKicker)"); continue; }

  raw = raw
    .replace(/"matchKicker":\s*".*?"/, `"carRentalKicker": "${esc(tr.kicker)}"`)
    .replace(/"matchTitle":\s*".*?"/, `"carRentalTitle": "${esc(tr.title)}"`)
    .replace(/"matchSub":\s*".*?"/, `"carRentalSub": "${esc(tr.sub)}"`)
    .replace(/"matchCta":\s*".*?"/, `"carRentalCta": "${esc(tr.cta)}"`);

  writeFileSync(path, raw);
  done++;
}

console.log(`Patched ${done} locales.`);
if (skipped.length) console.log("Skipped:", skipped.join(", "));
