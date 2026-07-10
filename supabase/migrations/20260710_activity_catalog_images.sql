-- Itération gate visuel 09/07 : cartes catalogue avec image d'illustration.
-- Images libres (Wikimedia Commons), même pratique que beaches/villages.
alter table public.activity_catalog_items add column if not exists image_url text;
notify pgrst, 'reload schema';
