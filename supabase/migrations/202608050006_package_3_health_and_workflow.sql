-- Precision Herd Management - Swine
-- v0.4.0 / Package 3: health records and workflow enhancements
-- Run ONCE after 202608050005_reproductive_status_summary.sql.

begin;

do $$
begin
  if to_regclass('public.litter_pigs') is null
     or to_regclass('public.heat_events') is null
     or to_regclass('public.synchronization_events') is null
     or to_regclass('public.stud_listings') is null then
    raise exception 'v0.3.3 is required. Run migrations through 202608050005 first.';
  end if;
end $$;

alter table public.stud_listings
  add column if not exists library_category text not null default 'saved_later'
  check (library_category in ('active_recent','saved_later','past'));

update public.stud_listings
set library_category=case
  when availability_status in ('retired','unavailable') then 'past'
  when availability_status='available' then 'active_recent'
  else 'saved_later'
end
where library_category='saved_later';

-- Preserve pedigree names previously represented only by in-herd sire/dam links.
update public.animals child
set sire_name=parent.call_name
from public.animals parent
where child.sire_id=parent.id and nullif(trim(child.sire_name),'') is null;

update public.animals child
set dam_name=parent.call_name
from public.animals parent
where child.dam_id=parent.id and nullif(trim(child.dam_name),'') is null;

alter table public.synchronization_events add column if not exists protocol_code text;
alter table public.synchronization_events add column if not exists matrix_start_date date;
alter table public.synchronization_events add column if not exists pg600_date date;
alter table public.synchronization_events add column if not exists projected_heat_date date;

create index if not exists synchronization_events_female_projected_heat_idx
  on public.synchronization_events(female_animal_id,projected_heat_date desc);
create index if not exists stud_listings_farm_category_idx
  on public.stud_listings(farm_id,library_category,boar_name);

create table if not exists public.health_treatments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  treatment_date date not null default current_date,
  condition_reason text,
  product_name text not null,
  dosage text,
  route text,
  administered_by text,
  withdrawal_end_date date,
  response text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_treatments_farm_animal_date_idx
  on public.health_treatments(farm_id,animal_id,treatment_date desc);

alter table public.health_treatments enable row level security;

drop policy if exists "members manage health treatments" on public.health_treatments;
create policy "members manage health treatments"
on public.health_treatments for all to authenticated
using (public.is_farm_member(farm_id))
with check (public.is_farm_member(farm_id) and created_by=auth.uid());

grant select,insert,update,delete on public.health_treatments to authenticated;

commit;
