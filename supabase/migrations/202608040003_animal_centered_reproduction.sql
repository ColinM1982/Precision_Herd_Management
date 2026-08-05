-- Precision Herd Management - Swine
-- Package 2.1: animal-centered reproduction and independent litter records
-- Run ONCE after 202608030002_package_2_reproduction.sql.

begin;

do $$
begin
  if to_regclass('public.animals') is null
     or to_regclass('public.mating_plans') is null
     or to_regclass('public.breeding_cycles') is null
     or to_regclass('public.offspring_groups') is null then
    raise exception 'Package 2 is required. Run migrations 202608030001 and 202608030002 first.';
  end if;
end $$;

-- Registration identifiers needed by the NSR and CPS exports.
alter table public.animals add column if not exists ear_notch text;
alter table public.stud_listings add column if not exists ear_notch text;
alter table public.stud_listings add column if not exists owner_name text;
alter table public.stud_listings add column if not exists owner_number text;

-- Mating plans remain attached directly to a sow/gilt. A target farrowing
-- date drives the target breeding date; no breeding_cycle row is required.
alter table public.mating_plans add column if not exists target_farrow_date date;
alter table public.mating_plans add column if not exists actual_breeding_date date;
alter table public.mating_plans add column if not exists breeding_method text;

create or replace function public.sync_mating_plan_target_dates() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.target_farrow_date is not null
     and (tg_op = 'INSERT' or new.target_farrow_date is distinct from old.target_farrow_date) then
    new.target_breeding_date := new.target_farrow_date - 114;
  end if;
  return new;
end; $$;

drop trigger if exists sync_mating_plan_target_dates on public.mating_plans;
create trigger sync_mating_plan_target_dates
before insert or update of target_farrow_date on public.mating_plans
for each row execute function public.sync_mating_plan_target_dates();

update public.mating_plans
set target_farrow_date = target_breeding_date + 114
where target_breeding_date is not null and target_farrow_date is null;

-- Heat history is recorded against the individual sow/gilt. The application
-- projects the next window at 18-21 days and future cycles from these facts.
create table if not exists public.heat_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  female_animal_id uuid not null references public.animals(id) on delete cascade,
  observed_date date not null,
  standing_heat boolean not null default true,
  source text not null default 'observed',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists heat_events_farm_female_date_idx
  on public.heat_events(farm_id,female_animal_id,observed_date desc);

-- Package 2 events are retained, but breeding_cycle_id becomes an optional
-- legacy link. New events attach directly to the female and optional plan.
alter table public.synchronization_events alter column breeding_cycle_id drop not null;
alter table public.synchronization_events add column if not exists female_animal_id uuid references public.animals(id) on delete cascade;
alter table public.synchronization_events add column if not exists mating_plan_id uuid references public.mating_plans(id) on delete set null;

alter table public.breeding_events alter column breeding_cycle_id drop not null;
alter table public.breeding_events add column if not exists female_animal_id uuid references public.animals(id) on delete cascade;
alter table public.breeding_events add column if not exists mating_plan_id uuid references public.mating_plans(id) on delete set null;
alter table public.breeding_events add column if not exists stud_listing_id uuid references public.stud_listings(id) on delete set null;

alter table public.pregnancy_checks alter column breeding_cycle_id drop not null;
alter table public.pregnancy_checks add column if not exists female_animal_id uuid references public.animals(id) on delete cascade;
alter table public.pregnancy_checks add column if not exists mating_plan_id uuid references public.mating_plans(id) on delete set null;

update public.synchronization_events e set female_animal_id=c.female_animal_id, mating_plan_id=c.mating_plan_id
from public.breeding_cycles c where e.breeding_cycle_id=c.id and e.female_animal_id is null;
update public.breeding_events e set female_animal_id=c.female_animal_id, mating_plan_id=c.mating_plan_id, stud_listing_id=c.sire_listing_id
from public.breeding_cycles c where e.breeding_cycle_id=c.id and e.female_animal_id is null;
update public.pregnancy_checks e set female_animal_id=c.female_animal_id, mating_plan_id=c.mating_plan_id
from public.breeding_cycles c where e.breeding_cycle_id=c.id and e.female_animal_id is null;

create index if not exists synchronization_events_female_idx on public.synchronization_events(female_animal_id,event_date desc);
create index if not exists breeding_events_female_idx on public.breeding_events(female_animal_id,event_date desc);
create index if not exists pregnancy_checks_female_idx on public.pregnancy_checks(female_animal_id,check_date desc);

-- One profile per association supplies owner/herd information for portal-ready exports.
create table if not exists public.farm_registry_profiles (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  association text not null,
  owner_name text,
  business_name text,
  address_line_1 text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  herd_mark text,
  breeder_number text,
  signature_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(farm_id,association)
);

-- offspring_groups is the litter header. It remains separate from animals.
alter table public.birth_events add column if not exists sire_listing_id uuid references public.stud_listings(id) on delete set null;
alter table public.birth_events add column if not exists mating_plan_id uuid references public.mating_plans(id) on delete set null;

alter table public.offspring_groups add column if not exists sire_listing_id uuid references public.stud_listings(id) on delete set null;
alter table public.offspring_groups add column if not exists registry_association text;
alter table public.offspring_groups add column if not exists breed text;
alter table public.offspring_groups add column if not exists litter_notch text;
alter table public.offspring_groups add column if not exists litter_number text;
alter table public.offspring_groups add column if not exists parity integer check(parity is null or parity > 0);
alter table public.offspring_groups add column if not exists litter_birth_weight numeric(10,2) check(litter_birth_weight is null or litter_birth_weight >= 0);
alter table public.offspring_groups add column if not exists number_after_transfer integer check(number_after_transfer is null or number_after_transfer >= 0);
alter table public.offspring_groups add column if not exists number_weighed integer check(number_weighed is null or number_weighed >= 0);
alter table public.offspring_groups add column if not exists litter_weaning_weight numeric(10,2) check(litter_weaning_weight is null or litter_weaning_weight >= 0);
alter table public.offspring_groups add column if not exists estrus_date date;
alter table public.offspring_groups add column if not exists boar_group_name text;
alter table public.offspring_groups add column if not exists gilt_group_name text;
alter table public.offspring_groups add column if not exists updated_at timestamptz not null default now();

-- These pigs are deliberately NOT public.animals. A pig becomes a herd animal
-- only when the user explicitly chooses Move to Herd.
create table if not exists public.litter_pigs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  offspring_group_id uuid not null references public.offspring_groups(id) on delete cascade,
  sequence_number integer not null check(sequence_number > 0),
  pig_name text,
  sex_class text not null default 'unknown' check(sex_class in ('boar','gilt','barrow','unknown')),
  individual_notch text,
  registration_number text,
  registered_name text,
  teat_count_left integer check(teat_count_left is null or teat_count_left >= 0),
  teat_count_right integer check(teat_count_right is null or teat_count_right >= 0),
  birth_date date not null,
  birth_weight numeric(8,2) check(birth_weight is null or birth_weight >= 0),
  weaning_date date,
  weaning_weight numeric(8,2) check(weaning_weight is null or weaning_weight >= 0),
  status text not null default 'alive',
  status_date date,
  sale_date date,
  sale_price numeric(10,2) check(sale_price is null or sale_price >= 0),
  buyer_name text,
  buyer_address text,
  herd_animal_id uuid unique references public.animals(id) on delete set null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(offspring_group_id,sequence_number)
);
create index if not exists litter_pigs_group_idx on public.litter_pigs(offspring_group_id,sequence_number);
create index if not exists litter_pigs_farm_status_idx on public.litter_pigs(farm_id,status);

-- Preserve any litter data created with the original Package 2 function.
-- Existing herd animals remain animals and are linked to their new litter-pig row.
with legacy as (
  select ogm.offspring_group_id, ogm.farm_id, ogm.animal_id,
         row_number() over(partition by ogm.offspring_group_id order by coalesce(ogm.birth_order,2147483647),ogm.animal_id)::integer as sequence_number,
         ogm.birth_weight, ogm.status_at_birth, ogm.notes,
         a.call_name, a.sex, a.birth_date
  from public.offspring_group_members ogm
  join public.animals a on a.id=ogm.animal_id
)
insert into public.litter_pigs(farm_id,offspring_group_id,sequence_number,pig_name,sex_class,birth_date,birth_weight,status,herd_animal_id,notes,created_by)
select l.farm_id,l.offspring_group_id,l.sequence_number,l.call_name,
       case when l.sex in ('boar','gilt','barrow') then l.sex else 'unknown' end,
       l.birth_date,l.birth_weight,coalesce(l.status_at_birth,'alive'),l.animal_id,l.notes,a.created_by
from legacy l join public.animals a on a.id=l.animal_id
on conflict(offspring_group_id,sequence_number) do nothing;

alter table public.heat_events enable row level security;
alter table public.farm_registry_profiles enable row level security;
alter table public.litter_pigs enable row level security;

drop policy if exists "members manage heat events" on public.heat_events;
create policy "members manage heat events" on public.heat_events for all to authenticated
using(public.is_farm_member(farm_id))
with check(public.is_farm_member(farm_id) and created_by=auth.uid());

drop policy if exists "members manage registry profiles" on public.farm_registry_profiles;
create policy "members manage registry profiles" on public.farm_registry_profiles for all to authenticated
using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));

drop policy if exists "members manage litter pigs" on public.litter_pigs;
create policy "members manage litter pigs" on public.litter_pigs for all to authenticated
using(public.is_farm_member(farm_id))
with check(public.is_farm_member(farm_id) and created_by=auth.uid());

grant select,insert,update,delete on public.heat_events,public.farm_registry_profiles,public.litter_pigs to authenticated;

-- Prevent an older browser tab from calling the Package 2 RPC that inserted
-- every live piglet into public.animals. Historical rows and the function
-- definition are retained, but authenticated app users can no longer execute it.
revoke execute on function public.create_birth_group(uuid,timestamptz,integer,integer,integer,integer,boolean,text) from authenticated;

-- Create a litter directly for a sow/gilt. This intentionally creates only
-- litter_pigs rows; it never inserts into public.animals.
create or replace function public.create_litter_for_female(
  p_female_id uuid,
  p_sire_listing_id uuid,
  p_mating_plan_id uuid,
  p_event_date timestamptz,
  p_total_born integer,
  p_born_alive integer,
  p_stillborn integer default 0,
  p_mummified integer default 0,
  p_litter_notch text default null,
  p_registry_association text default null,
  p_assistance_required boolean default false,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_female public.animals%rowtype;
  v_birth_id uuid;
  v_group_id uuid;
  v_group_name text;
  v_status text;
  i integer;
begin
  select * into v_female from public.animals where id=p_female_id;
  if not found or not public.is_farm_member(v_female.farm_id) then
    raise exception 'Female not found or access denied';
  end if;
  if v_female.sex not in ('sow','gilt') then raise exception 'Animal must be a sow or gilt'; end if;
  if p_total_born < 0 or p_born_alive < 0 or p_stillborn < 0 or p_mummified < 0 then
    raise exception 'Birth counts cannot be negative';
  end if;
  if p_born_alive + p_stillborn + p_mummified > p_total_born then
    raise exception 'Born alive, stillborn, and mummified cannot exceed total born';
  end if;
  if p_sire_listing_id is not null and not exists(
    select 1 from public.stud_listings s where s.id=p_sire_listing_id and s.farm_id=v_female.farm_id
  ) then raise exception 'Selected boar does not belong to this farm'; end if;
  if p_mating_plan_id is not null and not exists(
    select 1 from public.mating_plans m where m.id=p_mating_plan_id and m.farm_id=v_female.farm_id and m.female_animal_id=p_female_id
  ) then raise exception 'Selected mating plan does not belong to this female'; end if;

  insert into public.birth_events(
    farm_id,breeding_cycle_id,female_animal_id,sire_listing_id,mating_plan_id,event_date,
    total_born,born_alive,stillborn,mummified,assistance_required,notes,created_by
  ) values(
    v_female.farm_id,null,p_female_id,p_sire_listing_id,p_mating_plan_id,p_event_date,
    p_total_born,p_born_alive,p_stillborn,p_mummified,p_assistance_required,p_notes,auth.uid()
  ) returning id into v_birth_id;

  v_group_name := v_female.call_name || ' - ' || to_char(p_event_date at time zone 'UTC','Mon DD, YYYY');
  insert into public.offspring_groups(
    farm_id,birth_event_id,group_name,species,birth_date,sire_listing_id,registry_association,
    breed,litter_notch,litter_number,notes
  ) values(
    v_female.farm_id,v_birth_id,v_group_name,'swine',p_event_date::date,p_sire_listing_id,
    nullif(trim(p_registry_association),''),v_female.breed,nullif(trim(p_litter_notch),''),
    nullif(trim(p_litter_notch),''),p_notes
  ) returning id into v_group_id;

  for i in 1..p_total_born loop
    v_status := case
      when i <= p_born_alive then 'alive'
      when i <= p_born_alive + p_stillborn then 'stillborn'
      when i <= p_born_alive + p_stillborn + p_mummified then 'mummified'
      else 'outcome_not_recorded'
    end;
    insert into public.litter_pigs(
      farm_id,offspring_group_id,sequence_number,birth_date,status,created_by
    ) values(v_female.farm_id,v_group_id,i,p_event_date::date,v_status,auth.uid());
  end loop;

  if p_mating_plan_id is not null then
    update public.mating_plans set status='farrowed',updated_at=now() where id=p_mating_plan_id;
  end if;
  return v_group_id;
end; $$;

revoke all on function public.create_litter_for_female(uuid,uuid,uuid,timestamptz,integer,integer,integer,integer,text,text,boolean,text) from public;
grant execute on function public.create_litter_for_female(uuid,uuid,uuid,timestamptz,integer,integer,integer,integer,text,text,boolean,text) to authenticated;

-- Explicitly promote one litter pig into the managed herd.
create or replace function public.promote_litter_pig_to_herd(p_litter_pig_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_pig public.litter_pigs%rowtype;
  v_group public.offspring_groups%rowtype;
  v_birth public.birth_events%rowtype;
  v_dam public.animals%rowtype;
  v_sire_name text;
  v_new_id uuid;
  v_call_name text;
begin
  select * into v_pig from public.litter_pigs where id=p_litter_pig_id;
  if not found or not public.is_farm_member(v_pig.farm_id) then raise exception 'Litter pig not found or access denied'; end if;
  if v_pig.herd_animal_id is not null then return v_pig.herd_animal_id; end if;
  select * into v_group from public.offspring_groups where id=v_pig.offspring_group_id;
  select * into v_birth from public.birth_events where id=v_group.birth_event_id;
  select * into v_dam from public.animals where id=v_birth.female_animal_id;
  select boar_name into v_sire_name from public.stud_listings where id=v_group.sire_listing_id;
  v_call_name := coalesce(nullif(trim(v_pig.pig_name),''),v_group.group_name || ' #' || v_pig.sequence_number::text);

  insert into public.animals(
    farm_id,call_name,registered_name,species,breed,sex,status,birth_date,primary_id,ear_notch,
    sire_name,dam_name,dam_id,notes,created_by
  ) values(
    v_pig.farm_id,v_call_name,v_pig.registered_name,'swine',v_group.breed,
    case when v_pig.sex_class in ('boar','gilt','barrow') then v_pig.sex_class else 'piglet' end,
    'active',v_pig.birth_date,
    case when v_group.litter_notch is not null and v_pig.individual_notch is not null then v_group.litter_notch||'-'||v_pig.individual_notch else v_pig.individual_notch end,
    case when v_group.litter_notch is not null and v_pig.individual_notch is not null then v_group.litter_notch||'-'||v_pig.individual_notch else v_pig.individual_notch end,
    v_sire_name,v_dam.call_name,v_dam.id,v_pig.notes,auth.uid()
  ) returning id into v_new_id;

  update public.litter_pigs set herd_animal_id=v_new_id,status='retained',updated_at=now() where id=v_pig.id;
  if v_pig.registration_number is not null and v_group.registry_association is not null then
    insert into public.registrations(animal_id,farm_id,association,registration_number,registered_name,transfer_status)
    values(v_new_id,v_pig.farm_id,v_group.registry_association,v_pig.registration_number,v_pig.registered_name,'recorded');
  end if;
  return v_new_id;
end; $$;

revoke all on function public.promote_litter_pig_to_herd(uuid) from public;
grant execute on function public.promote_litter_pig_to_herd(uuid) to authenticated;

commit;
