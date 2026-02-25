import type { BrochureSetup } from '../types'
import { db } from './database'
import { enqueueSync } from './syncQueue'
import { getUserProfile } from './userProfile'
import { saveBrochureSettingsToSupabase } from '../services/brochureSettingsService'
import { features } from '../config/features'
import { supabase } from '../lib/supabase'

/** Converts ArrayBuffer (stored) or Blob (legacy) to Blob for app use. */
function toBlob(value: ArrayBuffer | Blob): Blob {
  if (value instanceof Blob) return value
  return new Blob([value])
}

/** Converts Blob to ArrayBuffer for IndexedDB storage (iOS compatibility). */
async function toArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}

export async function getBrochureSetup(
  trailId: string
): Promise<BrochureSetup | undefined> {
  const raw = await db.brochureSetup.get(trailId)
  if (!raw) return undefined
  const coverPhoto =
    raw.coverPhotoBlob != null
      ? toBlob(raw.coverPhotoBlob as ArrayBuffer | Blob)
      : null
  const mapBlob =
    (raw as { mapBlob?: ArrayBuffer | Blob | null }).mapBlob != null
      ? toBlob((raw as { mapBlob: ArrayBuffer | Blob }).mapBlob)
      : null
  const { funderLogos: _omit, ...rest } = raw as unknown as { funderLogos?: unknown; funderText?: string; [k: string]: unknown }
  return {
    ...rest,
    coverPhotoBlob: coverPhoto,
    mapBlob,
    funderText: rest.funderText ?? '',
  } as BrochureSetup
}

export async function saveBrochureSetup(setup: BrochureSetup): Promise<void> {
  const id = setup.trailId
  const coverPhotoBuf =
    setup.coverPhotoBlob != null
      ? await toArrayBuffer(setup.coverPhotoBlob)
      : null
  const mapBlobBuf =
    setup.mapBlob != null ? await toArrayBuffer(setup.mapBlob) : null
  const recordForDb = {
    ...setup,
    id,
    coverPhotoBlob: coverPhotoBuf,
    mapBlob: mapBlobBuf,
  }
  await db.brochureSetup.put(
    recordForDb as unknown as BrochureSetup
  )
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    const profile = await getUserProfile()
    if (profile?.email) {
      void saveBrochureSettingsToSupabase(setup, profile.email).catch((err) =>
        console.error('[brochureSetup] Supabase sync failed:', err)
      )
    }
    void enqueueSync('create', 'brochure_setup', id, {})
  }
}
