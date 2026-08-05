-- Precision Herd Management - Swine v0.3.3
-- Package 2.4: Herd reproductive status summary
-- Run once after 202608050004_outside_herd_archive_and_deletion.sql.

begin;

do $$
begin
  if to_regclass('public.animals') is null
     or to_regclass('public.birth_events') is null then
    raise exception 'Precision Herd Management v0.3.1 is required before Package 2.4.';
  end if;
end $$;

alter table public.animals
  add column if not exists reproductive_due_date date;

-- Convert the former free-text values into the three animal-profile choices.
update public.animals
set reproductive_status = case
  when sex not in ('sow','gilt') then null
  when lower(coalesce(reproductive_status,'')) in
       ('bred','pregnant','confirmed pregnant','confirmed_pregnant') then 'bred'
  when lower(coalesce(reproductive_status,'')) in
       ('lactating','nursing','lactating/nursing','lactating_nursing') then 'lactating_nursing'
  else 'open'
end,
reproductive_due_date = case
  when sex in ('sow','gilt')
   and lower(coalesce(reproductive_status,'')) in
       ('bred','pregnant','confirmed pregnant','confirmed_pregnant')
    then reproductive_due_date
  else null
end;

alter table public.animals
  drop constraint if exists animals_reproductive_status_check;
alter table public.animals
  add constraint animals_reproductive_status_check
  check (reproductive_status is null or reproductive_status in ('open','bred','lactating_nursing'));

alter table public.animals
  drop constraint if exists animals_reproductive_due_date_check;
alter table public.animals
  add constraint animals_reproductive_due_date_check
  check (reproductive_due_date is null or reproductive_status = 'bred');

commit;
