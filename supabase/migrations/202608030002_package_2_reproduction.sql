-- Precision Herd Management Package 2
-- Run ONCE after 202608030001_initial_foundation.sql.

alter table public.animals add column if not exists sire_id uuid references public.animals(id) on delete set null;
alter table public.animals add column if not exists dam_id uuid references public.animals(id) on delete set null;
alter table public.mating_plans add column if not exists selected_stud_listing_id uuid references public.stud_listings(id) on delete set null;

create table public.breeding_cycles (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  female_animal_id uuid not null references public.animals(id) on delete cascade,
  mating_plan_id uuid references public.mating_plans(id) on delete set null,
  sire_listing_id uuid references public.stud_listings(id) on delete set null,
  cycle_start_date date not null default current_date,
  status text not null default 'planned' check(status in ('planned','synchronizing','bred','confirmed_pregnant','open','completed','cancelled')),
  expected_birth_date date,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index breeding_cycles_farm_idx on public.breeding_cycles(farm_id);
create index breeding_cycles_female_idx on public.breeding_cycles(female_animal_id);

create table public.synchronization_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  breeding_cycle_id uuid not null references public.breeding_cycles(id) on delete cascade,
  event_date timestamptz not null,
  protocol_name text,
  product_name text,
  dose text,
  route text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.breeding_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  breeding_cycle_id uuid not null references public.breeding_cycles(id) on delete cascade,
  event_date timestamptz not null,
  service_number integer not null default 1 check(service_number > 0),
  method text not null default 'artificial_insemination',
  semen_batch text,
  technician text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.pregnancy_checks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  breeding_cycle_id uuid not null references public.breeding_cycles(id) on delete cascade,
  check_date date not null,
  method text,
  result text not null check(result in ('positive','negative','inconclusive')),
  checked_by text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.birth_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  breeding_cycle_id uuid references public.breeding_cycles(id) on delete set null,
  female_animal_id uuid not null references public.animals(id) on delete cascade,
  event_date timestamptz not null,
  total_born integer not null default 0 check(total_born >= 0),
  born_alive integer not null default 0 check(born_alive >= 0),
  stillborn integer not null default 0 check(stillborn >= 0),
  mummified integer not null default 0 check(mummified >= 0),
  assistance_required boolean not null default false,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.offspring_groups (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  birth_event_id uuid not null unique references public.birth_events(id) on delete cascade,
  group_name text not null,
  species text not null,
  birth_date date not null,
  weaning_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.offspring_group_members (
  offspring_group_id uuid not null references public.offspring_groups(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  birth_weight numeric(8,2),
  birth_order integer,
  status_at_birth text not null default 'alive',
  notes text,
  primary key(offspring_group_id,animal_id)
);

alter table public.breeding_cycles enable row level security;
alter table public.synchronization_events enable row level security;
alter table public.breeding_events enable row level security;
alter table public.pregnancy_checks enable row level security;
alter table public.birth_events enable row level security;
alter table public.offspring_groups enable row level security;
alter table public.offspring_group_members enable row level security;

create policy "members manage breeding cycles" on public.breeding_cycles for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage synchronization events" on public.synchronization_events for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage breeding events" on public.breeding_events for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage pregnancy checks" on public.pregnancy_checks for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage birth events" on public.birth_events for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage offspring groups" on public.offspring_groups for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage offspring members" on public.offspring_group_members for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));

grant select,insert,update,delete on public.breeding_cycles, public.synchronization_events, public.breeding_events, public.pregnancy_checks, public.birth_events, public.offspring_groups, public.offspring_group_members to authenticated;

-- Creates the birth event, group, and live offspring atomically.
create or replace function public.create_birth_group(
  p_cycle_id uuid,
  p_event_date timestamptz,
  p_total_born integer,
  p_born_alive integer,
  p_stillborn integer default 0,
  p_mummified integer default 0,
  p_assistance_required boolean default false,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_cycle public.breeding_cycles%rowtype;
  v_species text;
  v_sire_name text;
  v_birth_id uuid;
  v_group_id uuid;
  v_offspring_id uuid;
  v_term text;
  i integer;
begin
  select * into v_cycle from public.breeding_cycles where id=p_cycle_id;
  if not found or not public.is_farm_member(v_cycle.farm_id) then raise exception 'Breeding cycle not found or access denied'; end if;
  if p_total_born < 0 or p_born_alive < 0 or p_stillborn < 0 or p_mummified < 0 then raise exception 'Birth counts cannot be negative'; end if;
  if p_born_alive + p_stillborn + p_mummified > p_total_born then raise exception 'Outcome counts exceed total born'; end if;
  v_species := 'swine';
  select boar_name into v_sire_name from public.stud_listings where id=v_cycle.sire_listing_id;
  v_term := 'Piglet';
  insert into public.birth_events(farm_id,breeding_cycle_id,female_animal_id,event_date,total_born,born_alive,stillborn,mummified,assistance_required,notes,created_by)
  values(v_cycle.farm_id,v_cycle.id,v_cycle.female_animal_id,p_event_date,p_total_born,p_born_alive,p_stillborn,p_mummified,p_assistance_required,p_notes,auth.uid()) returning id into v_birth_id;
  insert into public.offspring_groups(farm_id,birth_event_id,group_name,species,birth_date)
  values(v_cycle.farm_id,v_birth_id,(select call_name from public.animals where id=v_cycle.female_animal_id)||' '||extract(year from p_event_date)::text,v_species,p_event_date::date) returning id into v_group_id;
  for i in 1..p_born_alive loop
    insert into public.animals(farm_id,call_name,species,sex,status,birth_date,dam_id,sire_name,created_by)
    values(v_cycle.farm_id,v_term||' '||i,v_species,'unknown','active',p_event_date::date,v_cycle.female_animal_id,v_sire_name,auth.uid()) returning id into v_offspring_id;
    insert into public.offspring_group_members(offspring_group_id,animal_id,farm_id,birth_order) values(v_group_id,v_offspring_id,v_cycle.farm_id,i);
  end loop;
  update public.breeding_cycles set status='completed',updated_at=now() where id=v_cycle.id;
  return v_group_id;
end; $$;
revoke all on function public.create_birth_group(uuid,timestamptz,integer,integer,integer,integer,boolean,text) from public;
grant execute on function public.create_birth_group(uuid,timestamptz,integer,integer,integer,integer,boolean,text) to authenticated;
