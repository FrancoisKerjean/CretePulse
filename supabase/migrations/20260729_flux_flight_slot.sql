-- Capteur vols : creneau stable + journal des runs (regression 29/07/2026).
--
-- Constat en base : la contrainte unique portait sur sched_time, qui BOUGE des
-- que le tableau retime un vol ("Delayed", "New Time 12:20"). Chaque mise a jour
-- d'horaire inserait donc une ligne au lieu d'en mettre une a jour : 2 340 lignes
-- HER et 17 lignes CHQ en trop, et des comptes journaliers de 776 arrivees pour
-- un aeroport a ~150-200/jour.
--
-- Correctif : sched_slot = horaire de la PREMIERE observation du vol, immuable.
-- sched_time garde la derniere valeur affichee. Un meme numero peut voler deux
-- fois dans la journee (GQ 560 a 00:15 puis 20:25) : deux creneaux, deux lignes.

alter table flux_flight_arrivals add column if not exists sched_slot text;
update flux_flight_arrivals set sched_slot = sched_time where sched_slot is null;
alter table flux_flight_arrivals alter column sched_slot set not null;

alter table flux_flight_arrivals drop constraint if exists flux_flight_arrivals_dir_key;
alter table flux_flight_arrivals drop constraint if exists flux_flight_arrivals_slot_key;
alter table flux_flight_arrivals add constraint flux_flight_arrivals_slot_key
  unique (airport, direction, service_date, flight_no, sched_slot);

-- Journal des runs : sans lui, une panne de collecte est invisible. Le capteur
-- HER n'a rien ecrit du 22 au 27/07/2026 pendant que le cron tournait 144 fois
-- par jour ; le seul signal etait une ligne dans un log sans horodatage.
create table if not exists flux_collector_runs (
  id         bigint generated always as identity primary key,
  collector  text not null,
  airport    text,
  direction  text,
  ran_at     timestamptz not null default now(),
  ok         boolean not null,
  rows_seen  int not null default 0,
  inserted   int not null default 0,
  updated    int not null default 0,
  error      text
);

create index if not exists flux_collector_runs_recent
  on flux_collector_runs (collector, airport, direction, ran_at desc);
