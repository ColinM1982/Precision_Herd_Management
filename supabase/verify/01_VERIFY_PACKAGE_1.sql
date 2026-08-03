-- Run after the initial migration. Each query should return the expected objects.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('farms','farm_members','animals','stud_listings','mating_plans')
order by tablename;

select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname in ('create_farm_with_owner','is_farm_member','can_manage_farm')
order by proname;

select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in ('farm_members','animals','stud_listings')
order by tablename,policyname;

select id,public,file_size_limit from storage.buckets
where id in ('animal-photos','registration-documents','health-documents','stud-media')
order by id;

