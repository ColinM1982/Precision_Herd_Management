select column_name from information_schema.columns
where table_schema='public' and table_name='animals' and column_name in ('sire_id','dam_id') order by column_name;

select tablename,rowsecurity from pg_tables where schemaname='public'
and tablename in ('breeding_cycles','synchronization_events','breeding_events','pregnancy_checks','birth_events','offspring_groups','offspring_group_members') order by tablename;

select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname='create_birth_group';

select tablename,policyname from pg_policies where schemaname='public'
and tablename in ('breeding_cycles','birth_events','offspring_groups') order by tablename,policyname;

