-- Migration 002: Email-based identity (no Supabase Auth)
-- Run after 001. Replaces auth.users-linked user_profile with email-based.
--
-- Drop old user_profile and recreate with email as primary key.
-- Permissive RLS allows anon access (app scopes by email client-side).

drop table if exists user_profile cascade;

create table user_profile (
  email text primary key,
  name text,
  group_name text,
  group_code text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger user_profile_updated_at before update on user_profile
  for each row execute function update_updated_at();

-- Replace auth-based RLS with permissive (email identity scoped client-side)
drop policy if exists "Own profile only" on user_profile;
drop policy if exists "Group trails only" on trails;
drop policy if exists "Group pois only" on pois;
drop policy if exists "Group brochure only" on brochure_setup;

create policy "Allow anon all user_profile" on user_profile
  for all to anon using (true) with check (true);

create policy "Allow anon all trails" on trails
  for all to anon using (true) with check (true);

create policy "Allow anon all pois" on pois
  for all to anon using (true) with check (true);

create policy "Allow anon all brochure_setup" on brochure_setup
  for all to anon using (true) with check (true);

-- Storage: make buckets public so anon can upload (no Auth session).
-- Run in Dashboard → Storage → each bucket → set Public to ON.
