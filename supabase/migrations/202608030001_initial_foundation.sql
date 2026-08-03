-- Precision Herd Management - Package 1
-- Run once in a NEW Supabase project using SQL Editor.

create extension if not exists pgcrypto;

create type public.farm_role as enum ('owner','manager','member','viewer');
create type public.animal_status as enum ('active','for_sale','sold','deceased','culled','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  primary_species text not null default 'swine',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farm_members (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.farm_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (farm_id,user_id)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  location_type text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  call_name text not null check (length(trim(call_name)) > 0),
  registered_name text,
  species text not null default 'swine',
  breed text,
  sex text not null,
  reproductive_status text,
  status public.animal_status not null default 'active',
  birth_date date,
  color_markings text,
  primary_id text,
  location_id uuid references public.locations(id) on delete set null,
  sire_name text,
  dam_name text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animals_farm_idx on public.animals(farm_id);
create index animals_status_idx on public.animals(farm_id,status);

create table public.animal_identifiers (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  issuing_authority text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references public.animals(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  association text not null,
  registration_number text not null,
  registered_name text,
  registration_date date,
  transfer_status text,
  created_at timestamptz not null default now()
);

create table public.studs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  website_url text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.stud_listings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  stud_id uuid references public.studs(id) on delete set null,
  boar_name text not null check (length(trim(boar_name)) > 0),
  stud_name text not null check (length(trim(stud_name)) > 0),
  species text not null default 'swine',
  breed text,
  sire_name text,
  dam_name text,
  maternal_grandsire text,
  registration_association text,
  registration_number text,
  semen_price numeric(10,2) check (semen_price is null or semen_price >= 0),
  collection_type text default 'fresh',
  availability_status text not null default 'available',
  source_url text,
  strengths text,
  concerns text,
  notes text,
  last_verified_date date,
  is_favorite boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stud_listings_farm_idx on public.stud_listings(farm_id);

create table public.semen_price_history (
  id uuid primary key default gen_random_uuid(),
  stud_listing_id uuid not null references public.stud_listings(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  price numeric(10,2) not null check (price >= 0),
  effective_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.mating_plans (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  female_animal_id uuid not null references public.animals(id) on delete cascade,
  plan_name text,
  target_breeding_date date,
  status text not null default 'draft',
  objectives text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mating_plan_candidates (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  mating_plan_id uuid not null references public.mating_plans(id) on delete cascade,
  stud_listing_id uuid not null references public.stud_listings(id) on delete cascade,
  rank integer check (rank is null or rank > 0),
  estimated_cost numeric(10,2),
  selection_notes text,
  created_at timestamptz not null default now(),
  unique(mating_plan_id,stud_listing_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid references public.animals(id) on delete cascade,
  stud_listing_id uuid references public.stud_listings(id) on delete cascade,
  document_type text not null,
  bucket_name text not null,
  storage_path text not null,
  file_name text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

-- Create user profile after signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,new.raw_user_meta_data->>'full_name')
  on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER avoids recursive farm_members RLS checks.
create or replace function public.is_farm_member(p_farm_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.farm_members fm where fm.farm_id=p_farm_id and fm.user_id=auth.uid());
$$;
create or replace function public.can_manage_farm(p_farm_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.farm_members fm where fm.farm_id=p_farm_id and fm.user_id=auth.uid() and fm.role in ('owner','manager'));
$$;
revoke all on function public.is_farm_member(uuid) from public;
revoke all on function public.can_manage_farm(uuid) from public;
grant execute on function public.is_farm_member(uuid), public.can_manage_farm(uuid) to authenticated;

-- Atomic farm + owner membership creation.
create or replace function public.create_farm_with_owner(p_name text,p_primary_species text default 'swine') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_farm_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(p_name))=0 then raise exception 'Farm name is required'; end if;
  insert into public.farms(name,primary_species,created_by) values(trim(p_name),coalesce(nullif(trim(p_primary_species),''),'swine'),auth.uid()) returning id into v_farm_id;
  insert into public.farm_members(farm_id,user_id,role) values(v_farm_id,auth.uid(),'owner');
  return v_farm_id;
end; $$;
revoke all on function public.create_farm_with_owner(text,text) from public;
grant execute on function public.create_farm_with_owner(text,text) to authenticated;

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.locations enable row level security;
alter table public.animals enable row level security;
alter table public.animal_identifiers enable row level security;
alter table public.registrations enable row level security;
alter table public.studs enable row level security;
alter table public.stud_listings enable row level security;
alter table public.semen_price_history enable row level security;
alter table public.mating_plans enable row level security;
alter table public.mating_plan_candidates enable row level security;
alter table public.documents enable row level security;

create policy "profiles read own" on public.profiles for select to authenticated using(id=auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "members read farm" on public.farm_members for select to authenticated using(public.is_farm_member(farm_id));
create policy "managers add members" on public.farm_members for insert to authenticated with check(public.can_manage_farm(farm_id));
create policy "managers update members" on public.farm_members for update to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));
create policy "managers remove members" on public.farm_members for delete to authenticated using(public.can_manage_farm(farm_id) and user_id<>auth.uid());
create policy "members read farms" on public.farms for select to authenticated using(public.is_farm_member(id));
create policy "managers update farms" on public.farms for update to authenticated using(public.can_manage_farm(id)) with check(public.can_manage_farm(id));

-- Shared farm data policy template. All inserts must belong to a farm membership.
create policy "members manage locations" on public.locations for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage animals" on public.animals for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage identifiers" on public.animal_identifiers for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage registrations" on public.registrations for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage studs" on public.studs for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage stud listings" on public.stud_listings for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage price history" on public.semen_price_history for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage mating plans" on public.mating_plans for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());
create policy "members manage candidates" on public.mating_plan_candidates for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id));
create policy "members manage documents" on public.documents for all to authenticated using(public.is_farm_member(farm_id)) with check(public.is_farm_member(farm_id) and created_by=auth.uid());

-- Storage buckets are private. The first path segment MUST be the farm UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('animal-photos','animal-photos',false,10485760,array['image/jpeg','image/png','image/webp']),
('registration-documents','registration-documents',false,15728640,array['application/pdf','image/jpeg','image/png']),
('health-documents','health-documents',false,15728640,array['application/pdf','image/jpeg','image/png']),
('stud-media','stud-media',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy "farm members read herd files" on storage.objects for select to authenticated
using(bucket_id in ('animal-photos','registration-documents','health-documents','stud-media') and public.is_farm_member((storage.foldername(name))[1]::uuid));
create policy "farm members upload herd files" on storage.objects for insert to authenticated
with check(bucket_id in ('animal-photos','registration-documents','health-documents','stud-media') and public.is_farm_member((storage.foldername(name))[1]::uuid));
create policy "farm members update herd files" on storage.objects for update to authenticated
using(bucket_id in ('animal-photos','registration-documents','health-documents','stud-media') and public.is_farm_member((storage.foldername(name))[1]::uuid))
with check(bucket_id in ('animal-photos','registration-documents','health-documents','stud-media') and public.is_farm_member((storage.foldername(name))[1]::uuid));
create policy "farm managers delete herd files" on storage.objects for delete to authenticated
using(bucket_id in ('animal-photos','registration-documents','health-documents','stud-media') and public.can_manage_farm((storage.foldername(name))[1]::uuid));

grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;

