-- Precision Herd Management v0.4.0 / Package 3 verification
-- Every row in the first result should say PASS.

select check_name,
  case when passed then 'PASS' else 'FAIL' end as result
from (values
  ('health_treatments table exists', to_regclass('public.health_treatments') is not null),
  ('boar library category exists', exists(select 1 from information_schema.columns where table_schema='public' and table_name='stud_listings' and column_name='library_category')),
  ('sync protocol code exists', exists(select 1 from information_schema.columns where table_schema='public' and table_name='synchronization_events' and column_name='protocol_code')),
  ('Matrix start date exists', exists(select 1 from information_schema.columns where table_schema='public' and table_name='synchronization_events' and column_name='matrix_start_date')),
  ('PG 600 date exists', exists(select 1 from information_schema.columns where table_schema='public' and table_name='synchronization_events' and column_name='pg600_date')),
  ('projected heat date exists', exists(select 1 from information_schema.columns where table_schema='public' and table_name='synchronization_events' and column_name='projected_heat_date')),
  ('health treatment RLS enabled', coalesce((select relrowsecurity from pg_class where oid='public.health_treatments'::regclass),false)),
  ('health treatment policy exists', exists(select 1 from pg_policies where schemaname='public' and tablename='health_treatments' and policyname='members manage health treatments'))
) as checks(check_name,passed)
order by check_name;

select tablename,rowsecurity
from pg_tables
where schemaname='public' and tablename='health_treatments';

select tablename,policyname
from pg_policies
where schemaname='public' and tablename='health_treatments';

select
  (select count(*) from public.health_treatments) as treatment_records,
  (select count(*) from public.synchronization_events where protocol_code='matrix_pg600') as matrix_pg600_records,
  (select count(*) from public.stud_listings where library_category='active_recent') as active_recent_boars,
  (select count(*) from public.stud_listings where library_category='saved_later') as saved_for_later_boars,
  (select count(*) from public.stud_listings where library_category='past') as past_boars;
