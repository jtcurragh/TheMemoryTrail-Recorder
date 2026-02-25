-- Migration 007: Add graveyard_name to user_profile
-- Run after 006. Adds optional graveyard name for two-name welcome flow.
--
-- Do not run automatically; run manually in Supabase Dashboard → SQL Editor.

alter table user_profile add column if not exists graveyard_name text;

-- Optional: backfill existing rows where group_name was used for both parish and graveyard
-- (uncomment if you want to preserve legacy display names)
-- update user_profile set graveyard_name = group_name where graveyard_name is null and group_name is not null;
