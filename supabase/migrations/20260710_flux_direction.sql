-- Departs HER dans flux_flight_arrivals : colonne direction + contrainte unique adaptee.
-- La colonne origin stocke l'autre bout du vol : provenance (arrival) ou destination (departure).

alter table public.flux_flight_arrivals
  add column if not exists direction text not null default 'arrival';

-- Remplace la contrainte unique (airport, service_date, flight_no, sched_time)
-- par une version incluant direction (nom genere par Postgres -> drop dynamique).
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.flux_flight_arrivals'::regclass and contype = 'u';
  if c is not null then
    execute format('alter table public.flux_flight_arrivals drop constraint %I', c);
  end if;
end $$;

alter table public.flux_flight_arrivals
  add constraint flux_flight_arrivals_dir_key
  unique (airport, direction, service_date, flight_no, sched_time);

notify pgrst, 'reload schema';
