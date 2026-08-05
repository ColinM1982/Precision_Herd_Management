-- Precision Herd Management v0.3.0 verification
-- Run after 202608040003_animal_centered_reproduction.sql.
-- Every row in the first result should show PASS.

select 'heat_events table exists' as check_name,
       case when to_regclass('public.heat_events') is not null then 'PASS' else 'FAIL' end as result
union all
select 'litter_pigs table exists',
       case when to_regclass('public.litter_pigs') is not null then 'PASS' else 'FAIL' end
union all
select 'farm_registry_profiles table exists',
       case when to_regclass('public.farm_registry_profiles') is not null then 'PASS' else 'FAIL' end
union all
select 'breeding events no longer require a cycle',
       case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='breeding_events' and column_name='breeding_cycle_id' and is_nullable='YES') then 'PASS' else 'FAIL' end
union all
select 'pregnancy checks no longer require a cycle',
       case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='pregnancy_checks' and column_name='breeding_cycle_id' and is_nullable='YES') then 'PASS' else 'FAIL' end
union all
select 'create litter function exists',
       case when to_regprocedure('public.create_litter_for_female(uuid,uuid,uuid,timestamp with time zone,integer,integer,integer,integer,text,text,boolean,text)') is not null then 'PASS' else 'FAIL' end
union all
select 'move to herd function exists',
       case when to_regprocedure('public.promote_litter_pig_to_herd(uuid)') is not null then 'PASS' else 'FAIL' end
union all
select 'target farrow column exists',
       case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='mating_plans' and column_name='target_farrow_date') then 'PASS' else 'FAIL' end
union all
select 'litter pigs do not require animal_id',
       case when not exists(select 1 from information_schema.columns where table_schema='public' and table_name='litter_pigs' and column_name='animal_id') then 'PASS' else 'FAIL' end
union all
select 'legacy animal-creating litter function is disabled',
       case when not has_function_privilege('authenticated','public.create_birth_group(uuid,timestamp with time zone,integer,integer,integer,integer,boolean,text)','EXECUTE') then 'PASS' else 'FAIL' end;

-- These three rows should all show rowsecurity = true.
select relname as table_name, relrowsecurity as rowsecurity
from pg_class
where oid in ('public.heat_events'::regclass,'public.litter_pigs'::regclass,'public.farm_registry_profiles'::regclass)
order by relname;

-- These three policies should appear.
select tablename, policyname
from pg_policies
where schemaname='public'
  and tablename in ('heat_events','litter_pigs','farm_registry_profiles')
order by tablename,policyname;

-- Informational counts only. Zero is normal before you enter data.
select
  (select count(*) from public.heat_events) as heat_records,
  (select count(*) from public.offspring_groups) as litters,
  (select count(*) from public.litter_pigs) as separate_litter_pigs,
  (select count(*) from public.litter_pigs where herd_animal_id is not null) as litter_pigs_moved_to_herd;
