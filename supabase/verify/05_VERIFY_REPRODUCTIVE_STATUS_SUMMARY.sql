-- Precision Herd Management - verify v0.3.3 / Package 2.4

select
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result
from (
  values
    ('reproductive due date column exists', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='animals' and column_name='reproductive_due_date'
    )),
    ('reproductive status constraint exists', exists (
      select 1 from pg_constraint
      where conrelid='public.animals'::regclass and conname='animals_reproductive_status_check'
    )),
    ('due date constraint exists', exists (
      select 1 from pg_constraint
      where conrelid='public.animals'::regclass and conname='animals_reproductive_due_date_check'
    )),
    ('female statuses use supported values', not exists (
      select 1 from public.animals
      where sex in ('sow','gilt')
        and reproductive_status not in ('open','bred','lactating_nursing')
    )),
    ('non-bred animals have no reproductive due date', not exists (
      select 1 from public.animals
      where reproductive_due_date is not null and reproductive_status <> 'bred'
    ))
) as checks(check_name,passed)
order by check_name;

select
  reproductive_status,
  count(*) as animal_count,
  count(reproductive_due_date) as due_dates_recorded
from public.animals
where sex in ('sow','gilt')
group by reproductive_status
order by reproductive_status;
