-- Seed /stays : 3 annonces actives importees depuis Kairos Guest (properties).
-- Decisions Kami 25/07/2026 : proprietaire unique contact@kairosguest.com (aucun des
-- 3 proprietaires reels n a souscrit a crete.direct Stays), statut published sans iCal.
-- Idempotent : on conflict (slug) do update. Rejouable sans doublon.

insert into public.stay_owners (name, email, kyc_status) values ('Kairos Guest Management', 'contact@kairosguest.com', 'none') on conflict (email) do nothing;

insert into public.stay_listings
  (owner_id, slug, airbnb_url, title, description, photos, lat, lng, bedrooms, max_guests,
   base_price_eur, cleaning_fee_eur, min_nights, amenities, commission_rate, status)
values (
  (select id from public.stay_owners where email = 'contact@kairosguest.com'),
  'private-beach-vila-ferma', 'https://www.airbnb.com/rooms/16004558', 'Private Beach Vila · Ferma',
  'A wooden staircase runs from the deck down to your beach. Not the village beach, not the neighbour''s beach · yours, for the length of your stay.

Four separate wings strung along Ferma Bay. Two stone houses with kitchens and living rooms, one seafront apartment, two wooden cabins perched on the cliff. Each wing has its own bathroom, air-conditioning, and a door that locks.

Six bedrooms, twelve beds, twelve guests. Enough space for a three-generation family or a group of friends to cross paths only when they want to.

A 90 sqm studio with hammam, sauna and outdoor shower rounds out the property. Yoga in the morning, reading in the afternoon, hammam at night.

Seven minutes by car to Ierapetra · supermarkets, fishing harbour, tavernas. Seventy-five minutes from Heraklion airport.

Airbnb rating 4.88 across 32 stays · Guest Favorite.

Registered short-stay rental (ΑΜΑ 00000495658). Minimum stay 5 nights.',
  array['https://kairosguest.com/images/properties/private-beach-vila-ferma/01-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/02-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/03-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/04-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/05-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/06-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/07-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/08-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/09-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/10-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/11-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/12-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/13-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/14-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/15-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/16-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/17-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/18-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/19-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/20-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/21-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/22-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/23-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/24-photo.jpeg','https://kairosguest.com/images/properties/private-beach-vila-ferma/25-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/26-photo.jpg','https://kairosguest.com/images/properties/private-beach-vila-ferma/27-photo.jpeg']::text[],
  35.01848, 25.85674, 6, 12,
  945, 0, 5, '["Plage privée","Vue mer panoramique","Vue sur la baie","Vue jardin","Vue montagne","Sauna privé","Hammam","Studio professionnel 90 m²","Climatisation (toutes les ailes)","Wifi","Cuisine équipée","Espace de travail dédié","Lave-linge","Parking gratuit","Douche extérieure","Terrasse en bois","Escalier privé vers la plage","Animaux acceptés"]'::jsonb, 5, 'published'
)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, photos = excluded.photos,
  lat = excluded.lat, lng = excluded.lng, bedrooms = excluded.bedrooms,
  max_guests = excluded.max_guests, base_price_eur = excluded.base_price_eur,
  cleaning_fee_eur = excluded.cleaning_fee_eur, min_nights = excluded.min_nights,
  amenities = excluded.amenities, airbnb_url = excluded.airbnb_url, status = excluded.status;

insert into public.stay_listings
  (owner_id, slug, airbnb_url, title, description, photos, lat, lng, bedrooms, max_guests,
   base_price_eur, cleaning_fee_eur, min_nights, amenities, commission_rate, status)
values (
  (select id from public.stay_owners where email = 'contact@kairosguest.com'),
  'maison-piscine-makrygialos', null, 'Maison privée avec piscine, vue mer',
  'A family home set on a tree-lined 1,200 square metre plot in Makrygialos, eastern Crete. A rare format in the region, where plots rarely exceed 500 square metres.

Seventy-five square metres inside, two bedrooms, six sleepers, fitted kitchen and air conditioning. Outside, private pool with Aegean Sea views, garden, barbecue and free parking.

A few minutes on foot to Makrygialos seafront and its tavernas. The quiet of eastern Crete, away from the tourist bustle of the northern coast.

This is the family home of Kami, founder of Kairos. On-site presence all year round, no remote management.

Registered short-stay rental under AMA 00002476313. Five-night minimum. Pets not accepted.',
  array['https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775393991397-kerjean-0.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775393996692-kerjean-1.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394001265-kerjean-2.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394006465-kerjean-3.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394015417-kerjean-4.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394019602-kerjean-5.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394024883-kerjean-6.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394029263-kerjean-7.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394034707-kerjean-8.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394041738-kerjean-9.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394047222-kerjean-10.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394050893-kerjean-11.png','https://duupvqvnjvbshbpryejw.supabase.co/storage/v1/object/public/property-photos/64dc69a7-8598-4b1b-9fd2-bb782fc368e5/1775394054657-kerjean-12.png']::text[],
  35.0487, 25.9756, 2, 6,
  200, 60, 5, '["Piscine privée","Vue mer","Parking gratuit","Wi-Fi","Climatisation","Cuisine équipée","Jardin","Barbecue"]'::jsonb, 5, 'published'
)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, photos = excluded.photos,
  lat = excluded.lat, lng = excluded.lng, bedrooms = excluded.bedrooms,
  max_guests = excluded.max_guests, base_price_eur = excluded.base_price_eur,
  cleaning_fee_eur = excluded.cleaning_fee_eur, min_nights = excluded.min_nights,
  amenities = excluded.amenities, airbnb_url = excluded.airbnb_url, status = excluded.status;

insert into public.stay_listings
  (owner_id, slug, airbnb_url, title, description, photos, lat, lng, bedrooms, max_guests,
   base_price_eur, cleaning_fee_eur, min_nights, amenities, commission_rate, status)
values (
  (select id from public.stay_owners where email = 'contact@kairosguest.com'),
  'villa-danae-makrigialos', null, 'Villa Danae',
  'Five bedrooms, eleven real sleepers, two hundred square metres on a single level. A villa built to bring a tribe or a group together in south-east Crete, without compromising on space or view.

Set on Lagada Ridge above Makry Gialos, the villa turns its back to the road and opens onto the sea. Three rooms with a double bed, two rooms with single beds, four bathrooms, cot and high chair provided. Air conditioning in every bedroom.

Outside, the heated private pool extends the living space, the stone gazebo shelters long lunches, the pergola BBQ holds summer evenings. A panoramic rooftop terrace caps the house for sunsets over the bay.

Twenty minutes on foot to Lagkada beach, ten minutes by car to the village harbour and tavernas. Sitia airport 35 kilometres away, Heraklion two hours.

The format particularly suits yoga retreats, private celebrations and multi-generation extended families. Hosting in French, English and Greek.

Registered short-stay rental under AMA 10003069601. Three-night minimum. Pets not accepted.',
  array['https://kairosguest.com/images/properties/villa-danae-makrigialos/08-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/06-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/32-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/14-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/26-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/04-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/12-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/10-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/02-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/17-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/20-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/23-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/03-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/28-photo.jpg','https://kairosguest.com/images/properties/villa-danae-makrigialos/09-photo.jpg']::text[],
  35.0395, 25.7705, 5, 11,
  441, 120, 3, '["Vue mer","Piscine privee chauffee","Climatisation (toutes les chambres)","Wifi","Cuisine equipee","Lave-linge","Parking prive gratuit","BBQ sous pergola","Terrasse vue mer","Toit-terrasse panoramique","Gazebo en pierre","TV satellite","Lit bebe fourni","Chaise haute fournie","200 m² sur un niveau","Reception parlee FR / EN / GR"]'::jsonb, 5, 'published'
)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, photos = excluded.photos,
  lat = excluded.lat, lng = excluded.lng, bedrooms = excluded.bedrooms,
  max_guests = excluded.max_guests, base_price_eur = excluded.base_price_eur,
  cleaning_fee_eur = excluded.cleaning_fee_eur, min_nights = excluded.min_nights,
  amenities = excluded.amenities, airbnb_url = excluded.airbnb_url, status = excluded.status;

notify pgrst, 'reload schema';