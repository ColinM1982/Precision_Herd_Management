-- Precision Herd Management - Swine v0.3.1 verification

select check_name,
       case when passed then 'PASS' else 'FAIL' end as result
from (values
  ('animals status_date exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='animals' and column_name='status_date')),
  ('litter archived_at exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='offspring_groups' and column_name='archived_at')),
  ('delete animal function exists',to_regprocedure('public.delete_animal_permanently(uuid)') is not null),
  ('delete litter pig function exists',to_regprocedure('public.delete_litter_pig_permanently(uuid)') is not null),
  ('archive litter function exists',to_regprocedure('public.archive_completed_litter(uuid)') is not null),
  ('delete litter function exists',to_regprocedure('public.delete_litter_permanently(uuid)') is not null)
) checks(check_name,passed)
order by check_name;

select
  (select count(*) from public.animals where status in ('sold','culled','deceased','archived')) as outside_herd_animals,
  (select count(*) from public.litter_pigs where herd_animal_id is null and status in ('sold','culled','deceased','died','archived','stillborn','mummified')) as outside_herd_litter_pigs,
  (select count(*) from public.offspring_groups where archived_at is not null) as archived_litters;
