export type ListingStatus = "draft" | "published" | "unpublished";

export type RequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "deposit_paid"
  | "confirmed"
  | "cancelled";

export type AvailabilityStatus = "available" | "booked" | "blocked_ota" | "hold";

export interface StayOwner {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  stripe_connect_account_id: string | null;
  kyc_status: "none" | "pending" | "complete";
  /** Langue de ses emails, posee au depot de l'annonce (en/fr/de/el). */
  locale: string | null;
  created_at: string;
}

export interface StayListing {
  id: number;
  owner_id: number;
  slug: string;
  airbnb_id: string | null;
  airbnb_url: string | null;
  title: string | null;
  description: string | null;
  photos: string[];
  zone_id: string | null;
  location_slug: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  bedrooms: number | null;
  beds: number | null;
  max_guests: number | null;
  base_price_eur: number;
  cleaning_fee_eur: number;
  min_nights: number;
  amenities: unknown[];
  commission_rate: number;
  ical_private_url: string | null;
  ical_sync_meta: unknown | null;
  publish_token_hash: string | null;
  status: ListingStatus;
  created_at: string;
}

export interface StayRequest {
  id: number;
  listing_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  date_from: string;
  date_to: string;
  pax: number | null;
  message: string | null;
  status: RequestStatus;
  /** Langue de la page ou la demande a ete faite (en/fr/de/el). */
  locale: string | null;
  quoted_price_eur: number | null;
  quoted_at: string | null;
  approve_token_hash: string | null;
  pay_token_hash: string | null;
  stripe_session_id: string | null;
  deposit_amount: number | null;
  commission_eur: number | null;
  ip_hash: string | null;
  created_at: string;
}

/** Quote shown to the traveller. All amounts in EUR. */
export interface StayQuote {
  nights: number;
  /** Prix net proprietaire A LA NUIT. Le total sejour est ownerNetEur. */
  basePriceEur: number;
  /** Frais de menage, une fois par sejour. */
  cleaningFeeEur: number;
  ownerNetEur: number;
  commissionEur: number;
  guestTotalEur: number;
  depositEur: number;
  balanceEur: number;
  applicationFeeCents: number;
}
