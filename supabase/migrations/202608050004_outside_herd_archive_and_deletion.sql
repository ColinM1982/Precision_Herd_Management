-- Precision Herd Management - Swine
-- v0.3.1: Outside the Herd archive and guarded permanent deletion
-- Run ONCE after 202608040003_animal_centered_reproduction.sql.

begin;

do $$
begin
  if to_regclass('public.animals') is null
     or to_regclass('public.offspring_groups') is null
     or to_regclass('public.litter_pigs') is null then
    raise exception 'v0.3.0 is required. Run migration 202608040003 first.';
  end if;
end $$;

alter table public.animals add column if not exists status_date date;
alter table public.offspring_groups add column if not exists archived_at timestamptz;

update public.animals
set status_date=coalesce(updated_at::date,created_at::date)
where status in ('sold','culled','deceased','archived') and status_date is null;

create index if not exists animals_farm_status_date_idx on public.animals(farm_id,status,status_date desc);
create index if not exists offspring_groups_farm_archived_idx on public.offspring_groups(farm_id,archived_at);

create or replace function public.delete_animal_permanently(p_animal_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_farm_id uuid;
begin
  select farm_id into v_farm_id from public.animals where id=p_animal_id;
  if v_farm_id is null or not public.can_manage_farm(v_farm_id) then
    raise exception 'Animal not found or access denied';
  end if;
  delete from public.animals where id=p_animal_id;
end; $$;

revoke all on function public.delete_animal_permanently(uuid) from public;
grant execute on function public.delete_animal_permanently(uuid) to authenticated;

create or replace function public.delete_litter_pig_permanently(p_litter_pig_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_pig public.litter_pigs%rowtype;
  v_birth_id uuid;
begin
  select * into v_pig from public.litter_pigs where id=p_litter_pig_id;
  if not found or not public.can_manage_farm(v_pig.farm_id) then
    raise exception 'Litter pig not found or access denied';
  end if;
  if v_pig.herd_animal_id is not null then
    raise exception 'This pig is already in Herd Animals. Delete the herd-animal record first.';
  end if;

  select birth_event_id into v_birth_id from public.offspring_groups where id=v_pig.offspring_group_id;
  delete from public.litter_pigs where id=v_pig.id;

  update public.birth_events set
    total_born=greatest(total_born-1,0),
    born_alive=greatest(born_alive-case when v_pig.status not in ('stillborn','mummified','outcome_not_recorded') then 1 else 0 end,0),
    stillborn=greatest(stillborn-case when v_pig.status='stillborn' then 1 else 0 end,0),
    mummified=greatest(mummified-case when v_pig.status='mummified' then 1 else 0 end,0)
  where id=v_birth_id;
end; $$;

revoke all on function public.delete_litter_pig_permanently(uuid) from public;
grant execute on function public.delete_litter_pig_permanently(uuid) to authenticated;

create or replace function public.archive_completed_litter(p_offspring_group_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_farm_id uuid;
begin
  select farm_id into v_farm_id from public.offspring_groups where id=p_offspring_group_id;
  if v_farm_id is null or not public.is_farm_member(v_farm_id) then
    raise exception 'Litter not found or access denied';
  end if;
  if exists(
    select 1 from public.litter_pigs
    where offspring_group_id=p_offspring_group_id
      and herd_animal_id is null
      and status not in ('sold','culled','deceased','died','archived','stillborn','mummified')
  ) then
    raise exception 'Every pig must have a completed status or be moved to Herd Animals before archiving the litter.';
  end if;
  update public.offspring_groups set archived_at=now(),updated_at=now() where id=p_offspring_group_id;
end; $$;

revoke all on function public.archive_completed_litter(uuid) from public;
grant execute on function public.archive_completed_litter(uuid) to authenticated;

create or replace function public.delete_litter_permanently(p_offspring_group_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_farm_id uuid;
  v_birth_id uuid;
begin
  select farm_id,birth_event_id into v_farm_id,v_birth_id
  from public.offspring_groups where id=p_offspring_group_id;
  if v_farm_id is null or not public.can_manage_farm(v_farm_id) then
    raise exception 'Litter not found or access denied';
  end if;
  if exists(select 1 from public.litter_pigs where offspring_group_id=p_offspring_group_id and herd_animal_id is not null) then
    raise exception 'This litter has pigs in Herd Animals. Delete those herd-animal records first, then delete the litter.';
  end if;
  delete from public.birth_events where id=v_birth_id;
end; $$;

revoke all on function public.delete_litter_permanently(uuid) from public;
grant execute on function public.delete_litter_permanently(uuid) to authenticated;

commit;
