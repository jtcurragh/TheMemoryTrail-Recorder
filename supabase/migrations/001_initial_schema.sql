-- The Memory Trail PWA - Initial Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
--
-- If a previous run failed on user_profile, drop it first:
--   drop table if exists user_profile cascade;

-- User profiles (linked to Supabase Auth)
create table if not exists user_profile (
  id uuid primary key references auth.users(id),
  name text,
  group_name text,
  group_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trails
create table if not exists trails (
  id text primary key,
  group_code text not null,
  trail_type text not null check (trail_type in ('graveyard', 'parish')),
  display_name text,
  next_sequence int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- POIs
create table if not exists pois (
  id text primary key,
  trail_id text references trails(id) on delete cascade,
  group_code text,
  trail_type text,
  sequence int,
  filename text,
  photo_url text,
  thumbnail_url text,
  latitude float8,
  longitude float8,
  accuracy float8,
  captured_at timestamptz,
  site_name text,
  category text,
  description text,
  story text,
  url text,
  condition text,
  notes text,
  completed boolean default false,
  created_by text,
  last_modified_by text,
  last_modified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Brochure setup
create table if not exists brochure_setup (
  id text primary key,
  trail_id text references trails(id) on delete cascade,
  cover_title text,
  cover_photo_url text,
  group_name text,
  credits_text text,
  intro_text text,
  funder_logos_urls jsonb,
  map_url text,
  updated_at timestamptz default now()
);

-- Auto-update updated_at on every write
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trails_updated_at on trails;
create trigger trails_updated_at before update on trails
  for each row execute function update_updated_at();

drop trigger if exists pois_updated_at on pois;
create trigger pois_updated_at before update on pois
  for each row execute function update_updated_at();

drop trigger if exists brochure_updated_at on brochure_setup;
create trigger brochure_updated_at before update on brochure_setup
  for each row execute function update_updated_at();

drop trigger if exists user_profile_updated_at on user_profile;
create trigger user_profile_updated_at before update on user_profile
  for each row execute function update_updated_at();

-- Row Level Security
alter table user_profile enable row level security;
alter table trails enable row level security;
alter table pois enable row level security;
alter table brochure_setup enable row level security;

-- user_profile: users can only read/write their own profile
drop policy if exists "Own profile only" on user_profile;
create policy "Own profile only" on user_profile
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- trails: users can only see trails matching their group_code
drop policy if exists "Group trails only" on trails;
create policy "Group trails only" on trails
  for all using (
    group_code = (
      select group_code from user_profile where id = auth.uid()
    )
  );

-- pois: same group_code scoping
drop policy if exists "Group pois only" on pois;
create policy "Group pois only" on pois
  for all using (
    group_code = (
      select group_code from user_profile where id = auth.uid()
    )
  );

-- brochure_setup: via trail ownership
drop policy if exists "Group brochure only" on brochure_setup;
create policy "Group brochure only" on brochure_setup
  for all using (
    trail_id in (
      select id from trails where group_code = (
        select group_code from user_profile where id = auth.uid()
      )
    )
  );
