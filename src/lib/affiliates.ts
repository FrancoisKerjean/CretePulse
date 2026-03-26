/**
 * Centralized affiliate and partner links.
 * Replace placeholder URLs with actual affiliate URLs when available.
 * All links use rel="noopener noreferrer nofollow sponsored" for compliance.
 */

export const AFFILIATE_LINKS = {
  carRental: {
    url: "https://www.discovercars.com/?a_aid=cretedirect",
    label: { en: "Rent a car", fr: "Louer une voiture", de: "Auto mieten", el: "Ενοικίαση αυτοκινήτου" },
  },
  hotels: {
    url: "https://www.booking.com/region/gr/crete.html?aid=cretedirect",
    label: { en: "Find hotels", fr: "Trouver un hôtel", de: "Hotels finden", el: "Εύρεση ξενοδοχείου" },
  },
  tours: {
    url: "https://www.getyourguide.com/crete-l517/?partner_id=cretedirect",
    label: { en: "Book tours", fr: "Réserver des excursions", de: "Touren buchen", el: "Κράτηση εκδρομών" },
  },
  ferry: {
    url: "https://www.ferryhopper.com/en/destinations/greece/crete?affiliate=cretedirect",
    label: { en: "Book ferries", fr: "Réserver un ferry", de: "Fähren buchen", el: "Κράτηση πλοίων" },
  },
  flights: {
    url: "https://www.skyscanner.com/transport/flights-to/her/?associateid=cretedirect",
    label: { en: "Find flights", fr: "Trouver des vols", de: "Flüge finden", el: "Εύρεση πτήσεων" },
  },
  propertyManagement: {
    url: "https://kairosguest.com",
    label: { en: "Property management", fr: "Gestion locative", de: "Immobilienverwaltung", el: "Διαχείριση ακινήτων" },
  },
} as const;

export type AffiliateKey = keyof typeof AFFILIATE_LINKS;

export function getAffiliateLink(key: AffiliateKey) {
  return AFFILIATE_LINKS[key];
}
