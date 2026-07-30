-- crete.direct Stays : langue du voyageur et du proprietaire (lot B task 9, 30/07/2026)
--
-- Les pages servent en/fr/de/el, les emails partaient en francais seul. La langue
-- ne peut pas se deduire au moment de l'envoi : la demande de solde part 14 jours
-- avant l'arrivee, l'expiration 7 jours apres la demande, le webhook Stripe
-- n'importe quand. Elle est donc posee a l'ecriture et relue a l'envoi.
--
-- Valeurs attendues : 'en', 'fr', 'de', 'el'. NULL = inconnue, l'envoi retombe sur
-- l'anglais (pickEmailLocale dans src/lib/stays/emails.ts).

alter table public.stay_requests
  add column if not exists locale text;

alter table public.stay_owners
  add column if not exists locale text;

notify pgrst, 'reload schema';
