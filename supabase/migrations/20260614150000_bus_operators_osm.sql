-- Opérateurs supplémentaires pour le réseau OSM : urbains Heraklion/Chania + inconnu.
insert into bus_operators (id, name, region, source_url) values
  ('urban-her', 'Astiko KTEL Heraklion', 'Heraklion',          'https://www.osm.org'),
  ('urban-cha', 'Astiko KTEL Chania',    'Chania',             'https://www.osm.org'),
  ('unknown',   'Operateur inconnu',     'Crete',              'https://www.osm.org')
on conflict (id) do nothing;
notify pgrst, 'reload schema';
