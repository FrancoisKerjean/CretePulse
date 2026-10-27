-- Bug prod crete.direct : 29 slugs cb_places portent une virgule
-- (`agii-pantes-monastery,-loutraki`) -> /explore/[slug] rend 404 (la virgule est le
-- separateur du header interne x-next-cache-tags de Next), et le sitemap les annoncait.
-- Meme transform que le middleware (toAsciiPath) : virgule retiree, tirets doubles
-- fondus. 0 collision verifiee le 27/10/2026 sur les 29 (API PostgREST). 0 FK.
begin;
update cb_places
   set slug = regexp_replace(replace(slug, ',', ''), '-{2,}', '-', 'g')
 where slug like '%,%';
-- garde-fou : doit etre 0 apres migration
select count(*) as remaining_comma from cb_places where slug like '%,%';
commit;
