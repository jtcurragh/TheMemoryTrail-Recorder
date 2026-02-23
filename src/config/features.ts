// Feature flags control tier-gated functionality.
// Tiers: Free | Pro | EditorAdmin
// Currently all flags default to true for development.
// Future: replace boolean values with a tier-check function
// e.g. hasFeature('IMPORT_ZIP') that reads from localStorage or an auth token.

export const features = {
  // Pro tier
  IMPORT_ZIP_ENABLED: true,
  IMPORT_EXIF_ENABLED: false, // placeholder — not yet implemented

  // Supabase (Free tier: auth + sync)
  SUPABASE_SYNC_ENABLED: true,
  SUPABASE_AUTH_ENABLED: true,

  // EditorAdmin tier (future)
  TRAIL_VALIDATION_ENABLED: false,
  MULTI_TRAIL_MERGE_ENABLED: false,
} as const
