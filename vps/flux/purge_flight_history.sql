-- Purge de l'historique vols corrompu (29/07/2026). A executer UNE fois,
-- apres la migration 20260729_flux_flight_slot.sql.
--
-- Trois defauts se sont empiles sur flux_flight_arrivals :
--   1. la contrainte unique portait sur sched_time : chaque retard inserait une
--      ligne au lieu d'en mettre une a jour ;
--   2. la date de service venait de l'entete "Last Update" du tableau HER, alors
--      que le tableau demarre 1-2 h dans le passe : entre 00 h et 02 h locales
--      tout le tableau partait +1 jour, creant une journee fantome chaque nuit ;
--   3. l'incrementeur de minuit n'etait pas borne : une capture pouvait produire
--      jusqu'a 4 dates de service alors qu'un tableau de ~25 h en couvre 2.
--
-- On ne reconstitue rien : chaque regle supprime des lignes dont on peut prouver
-- qu'elles sont fausses, et les journees qui restent implausibles sont retirees
-- plutot que presentees comme mesurees.

\pset pager off
\echo '=== AVANT ==='
select airport, count(*) lignes, min(service_date) du, max(service_date) au
from flux_flight_arrivals group by 1 order by 1;

begin;

-- A. Ecart impossible entre la date de service et la date de capture. Un tableau
--    de ~25 h ne peut dater que le jour de capture, la veille (capture juste
--    apres minuit) ou le lendemain.
create temp table purge_log(regle text, lignes bigint);
with d as (
  delete from flux_flight_arrivals
  where service_date - first_seen_at::date not between -1 and 1 returning 1)
insert into purge_log select 'A ecart de date impossible', count(*) from d;

-- B. Captures HER faites entre 00 h et 02 h d'Athenes (21 h-22 h UTC) : la
--    fenetre ou l'entete datait le tableau du mauvais jour. Ces vols ont ete
--    recaptures avec la bonne date par les runs suivants.
with d as (
  delete from flux_flight_arrivals
  where airport = 'HER' and extract(hour from first_seen_at) in (21, 22) returning 1)
insert into purge_log select 'B fenetre minuit HER', count(*) from d;

-- C. Fenetre du 17 au 26/07 : la date renvoyee par l'entete etait figee au 16/07,
--    les captures se sont empilees sur des journees anterieures.
with d as (
  delete from flux_flight_arrivals
  where airport = 'HER' and first_seen_at::date - service_date = 1
    and first_seen_at::date between '2026-07-17' and '2026-07-26' returning 1)
insert into purge_log select 'C entete figee 17-26/07', count(*) from d;

-- D. Doublons de retard : deux lignes du meme vol le meme jour a moins de 4 h
--    d'ecart sont une seule ligne re-horodatee. On garde la derniere vue.
--    Au-dela de 4 h, c'est une seconde rotation reelle (GQ 560 a 00:15 et 20:25).
with d as (
  delete from flux_flight_arrivals r using flux_flight_arrivals k
  where r.airport = k.airport and r.direction = k.direction
    and r.service_date = k.service_date and r.flight_no = k.flight_no and r.id <> k.id
    and abs((substr(r.sched_time, 1, 2)::int * 60 + substr(r.sched_time, 4, 2)::int)
          - (substr(k.sched_time, 1, 2)::int * 60 + substr(k.sched_time, 4, 2)::int)) <= 240
    and (k.last_seen_at, k.id) > (r.last_seen_at, r.id) returning 1)
insert into purge_log select 'D doublons de retard', count(*) from d;

-- E. Journees HER encore hors bande apres A-D : la contamination y est trop
--    imbriquee pour etre demelee. Journee la plus chargee mesuree proprement :
--    186 vols. Au-dela de 220, la journee n'est pas exploitable, on la retire
--    des deux sens plutot que de la laisser fausser v_flux_stock_daily.
with d as (
  delete from flux_flight_arrivals
  where airport = 'HER' and service_date in (
    select service_date from flux_flight_arrivals where airport = 'HER'
    group by service_date, direction having count(*) > 220) returning 1)
insert into purge_log select 'E journees HER non exploitables', count(*) from d;

\echo '=== LIGNES SUPPRIMEES PAR REGLE ==='
select * from purge_log order by regle;

commit;

\echo '=== APRES : vols par journee de service ==='
select service_date, airport, direction, count(*) n
from flux_flight_arrivals group by 1, 2, 3 order by 2, 3, 1;
