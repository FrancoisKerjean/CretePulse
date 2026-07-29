import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const prioritySlugs = [
  "heraklion-airport",
  "heraklion-port",
  "elounda",
  "hersonissos",
  "malia",
];

const locationsSource = readFileSync(
  new URL("../src/lib/car-locations.ts", import.meta.url),
  "utf8",
);
for (const [index, slug] of prioritySlugs.entries()) {
  const start = locationsSource.indexOf(`"${slug}": {`);
  const nextSlug = prioritySlugs
    .slice(index + 1)
    .map((candidate) => locationsSource.indexOf(`"${candidate}": {`, start + 1))
    .filter((position) => position > start)
    .sort((a, b) => a - b)[0] ?? locationsSource.length;
  const contentStart = locationsSource.indexOf("content:", start);
  const metaBlock = locationsSource.slice(start, Math.min(contentStart, nextSlug));
  assert(start >= 0 && contentStart > start, `Missing priority car-rental landing: ${slug}`);

  const entries = [...metaBlock.matchAll(
    /(en|fr|de|el):\s*\{\s*title:\s*"([^"]+)",\s*desc:\s*"([^"]+)"/g,
  )];
  assert.equal(entries.length, 4, `${slug} must have four metadata locales`);
  for (const [, locale, title, desc] of entries) {
    if (locale === "en") {
      assert(
        title.length <= 60,
        `${slug}/${locale} title is too long for the primary search market (${title.length})`,
      );
    }
    assert(
      title.length <= 100,
      `${slug}/${locale} title is unexpectedly long (${title.length}): ${title}`,
    );
    assert(
      desc.length >= 100 && desc.length <= 180,
      `${slug}/${locale} description length is ${desc.length}`,
    );
  }
}

const wizard = readFileSync(
  new URL("../src/components/car-rental/CarRentalWizard.tsx", import.meta.url),
  "utf8",
);
for (const event of [
  "Car Wizard Viewed",
  "Car Wizard Started",
  "Car Wizard Step",
  "Car Wizard Submit",
  "Car Lead",
]) {
  assert(wizard.includes(`"${event}"`), `Missing funnel event: ${event}`);
}
for (const status of ["attempt", "success", "fallback", "network_error"]) {
  assert(wizard.includes(`status: "${status}"`), `Missing submit status: ${status}`);
}

const landingPage = readFileSync(
  new URL("../src/app/[locale]/car-rental/[location]/page.tsx", import.meta.url),
  "utf8",
);
assert(
  landingPage.includes('aria-labelledby="quote-process-title"'),
  "Missing visible quote process",
);
assert(
  landingPage.includes("No online prepayment through Crete Direct."),
  "Missing transparent payment reassurance",
);

console.log(
  `car-demand checks: ${prioritySlugs.length} priority landings, metadata, visible process and funnel events OK`,
);
