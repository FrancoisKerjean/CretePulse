-- /opt/cretepulse-content/migrations/2026-06-02-seeds-initial.sql
BEGIN;

-- 2 PILLAR
INSERT INTO guides_queue (slug, notes, status, format, priority, source, source_meta) VALUES
  ('where-to-stay-crete-12-zones-compared', 'Where to stay in Crete: 12 zones compared honestly by traveler type', 'pending', 'pillar', 95, 'seed-2026-06-02', '{"target_query":"where to stay in crete","seeded_by":"kami","design_doc":"2026-06-02-crete-direct-editorial-pipeline-revival-design.md"}'::jsonb),
  ('crete-in-may-weather-crowds-prices-2026', 'Crete in May 2026: weather, crowds, prices, what to actually do', 'pending', 'pillar', 92, 'seed-2026-06-02', '{"target_query":"crete in may","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 5 MID
INSERT INTO guides_queue (slug, notes, status, format, priority, source, source_meta) VALUES
  ('balos-vs-elafonisi-which-paradise-wins', 'Balos Lagoon vs Elafonisi: which Crete paradise beach really wins', 'pending', 'mid', 75, 'seed-2026-06-02', '{"target_query":"balos vs elafonisi","seeded_by":"kami"}'::jsonb),
  ('knossos-palace-worth-it-honest-take', 'Knossos Palace: is it worth the 20 euros and 2h in the heat?', 'pending', 'mid', 73, 'seed-2026-06-02', '{"target_query":"is knossos worth visiting","seeded_by":"kami"}'::jsonb),
  ('crete-with-kids-7-day-itinerary', 'Crete with kids: 7-day itinerary that won''t burn out parents', 'pending', 'mid', 72, 'seed-2026-06-02', '{"target_query":"crete with kids itinerary","seeded_by":"kami"}'::jsonb),
  ('driving-in-crete-mountain-roads-parking', 'Driving in Crete: what nobody tells you about mountain roads, parking, fuel', 'pending', 'mid', 71, 'seed-2026-06-02', '{"target_query":"driving in crete tips","seeded_by":"kami"}'::jsonb),
  ('heraklion-to-chania-4-ways-compared-2026', 'Heraklion Airport to Chania: 4 ways to get there with prices 2026', 'pending', 'mid', 70, 'seed-2026-06-02', '{"target_query":"heraklion to chania transport","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 8 SHORT
INSERT INTO guides_queue (slug, notes, status, format, priority, source, source_meta) VALUES
  ('tap-water-crete-can-you-drink', 'Can you drink tap water in Crete?', 'pending', 'short', 55, 'seed-2026-06-02', '{"target_query":"can you drink tap water in crete","seeded_by":"kami"}'::jsonb),
  ('cash-vs-card-crete-2026', 'How much cash should you bring to Crete vs card in 2026?', 'pending', 'short', 54, 'seed-2026-06-02', '{"target_query":"cash or card in crete","seeded_by":"kami"}'::jsonb),
  ('uber-crete-2026-alternatives', 'Is Uber available in Crete in 2026?', 'pending', 'short', 54, 'seed-2026-06-02', '{"target_query":"is uber available in crete","seeded_by":"kami"}'::jsonb),
  ('mosquitoes-crete-when-where', 'Are there mosquitoes in Crete? When and where they get bad', 'pending', 'short', 53, 'seed-2026-06-02', '{"target_query":"are there mosquitoes in crete","seeded_by":"kami"}'::jsonb),
  ('solo-female-travel-crete-safe-2026', 'Is Crete safe for solo female travelers in 2026?', 'pending', 'short', 53, 'seed-2026-06-02', '{"target_query":"is crete safe for solo female travelers","seeded_by":"kami"}'::jsonb),
  ('swim-crete-october-sea-temperature', 'Can you swim in Crete in October? Sea temperature month by month', 'pending', 'short', 52, 'seed-2026-06-02', '{"target_query":"can you swim in crete in october","seeded_by":"kami"}'::jsonb),
  ('tipping-crete-restaurants-how-much', 'Do you tip in Crete restaurants? How much is normal', 'pending', 'short', 52, 'seed-2026-06-02', '{"target_query":"do you tip in crete restaurants","seeded_by":"kami"}'::jsonb),
  ('dress-code-crete-monasteries', 'What''s the dress code for Crete monasteries (Arkadi, Toplou, Preveli)?', 'pending', 'short', 51, 'seed-2026-06-02', '{"target_query":"dress code crete monasteries","seeded_by":"kami"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
