-- Add coordinate_source to pois table
-- Run in Supabase Dashboard → SQL Editor
-- Additive only; existing rows are unaffected (column defaults to null)

ALTER TABLE pois ADD COLUMN IF NOT EXISTS coordinate_source text;
