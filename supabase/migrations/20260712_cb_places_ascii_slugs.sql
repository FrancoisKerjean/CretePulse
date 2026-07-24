-- Bug prod crete.direct : 14 slugs cb_places non-ASCII (’ U+2019, é, ν grec) cassent
-- le header interne x-next-cache-tags de Next -> 500 sur /explore/[slug] (436+ hits/7j).
-- Normalisation ASCII (deburr accents + strip apostrophes/grec), cohérente avec la
-- normalisation middleware. 0 FK, 0 photo/avis/ban lié (verifie 12/07). 0 collision.
begin;
update cb_places set slug = 'aphrodites-sanctuary-lenika'           where slug = 'aphrodite’s-sanctuary-lenika';
update cb_places set slug = 'bon-marche'                            where slug = 'bon-marché';
update cb_places set slug = 'church-of-panagia-at-smile'           where slug = 'church-of-panagia-at-smilé';
update cb_places set slug = 'eleonoras-falcon-falco-eleonorae'     where slug = 'eleonora’s-falcon-falco-eleonorae';
update cb_places set slug = 'fort-kales-at-ierapetra'              where slug = 'fort-kalés-at-ierapetra';
update cb_places set slug = 'kotschys-gecko-mediodactylus-kotschyi' where slug = 'kotschy’s-gecko-mediodactylus-kotschyi';
update cb_places set slug = 'mades-beach-ligaria'                  where slug = 'madés-beach-ligaria';
update cb_places set slug = 'marias-cave-malia'                    where slug = 'maria’s-cave-malia';
update cb_places set slug = 'papadiokambos-fishermens-house'       where slug = 'papadiokambos-fishermen’s-house';
update cb_places set slug = 'polioss-folklore-museum-asteri'       where slug = 'polios’s-folklore-museum-asteri';
update cb_places set slug = 'rissos-dolphin'                       where slug = 'risso’s-dolphin';
update cb_places set slug = 'seloudas-koutelo-wood'               where slug = 'selouda’s-koutelo-wood';
update cb_places set slug = 'trapeza-cave-kronio-tzermiado'        where slug = 'trapeza-cave-kronioν-tzermiado';
update cb_places set slug = 'votiros-and-grias-pies-agia-varvara'  where slug = 'votiros-and-gria’s-pies-agia-varvara';
-- garde-fou : doit etre 0 apres migration
select count(*) as remaining_non_ascii from cb_places where slug ~ '[^\x00-\x7F]';
commit;
