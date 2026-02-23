# Supabase Setup for The Memory Trail PWA

## 1. Run migrations

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor**
3. Run `supabase/migrations/001_initial_schema.sql` first
4. Then run `supabase/migrations/002_email_based_auth.sql` (email-based identity, no Auth)

## 2. Create storage buckets

Go to **Storage** in the dashboard and create two buckets:

| Bucket name      | Access  | Purpose                                |
|------------------|---------|----------------------------------------|
| `poi-photos`     | **Public** | POI photos and thumbnails           |
| `brochure-assets`| **Public** | Cover photos, funder logos, maps   |

**Important:** Buckets must be **public** so the anon key can upload (email-based identity does not use Supabase Auth).

Path structure:
- `poi-photos/{trail_id}/{filename}`
- `brochure-assets/{trail_id}/{filename}`
