import type { BrochureSetup } from '../types'
import { db } from './database'
import { enqueueSync } from './syncQueue'
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
  const funderLogos = (raw.funderLogos as (ArrayBuffer | Blob)[]).map(toBlob)
  return {
    ...raw,
    coverPhotoBlob: coverPhoto,
    funderLogos,
  } as BrochureSetup
}

export async function saveBrochureSetup(setup: BrochureSetup): Promise<void> {
  const id = setup.trailId
  const coverPhotoBuf =
    setup.coverPhotoBlob != null
      ? await toArrayBuffer(setup.coverPhotoBlob)
      : null
  const funderLogosBuf = await Promise.all(
    setup.funderLogos.map((b) => toArrayBuffer(b))
  )
  const recordForDb = {
    ...setup,
    id,
    coverPhotoBlob: coverPhotoBuf,
    funderLogos: funderLogosBuf,
  }
  await db.brochureSetup.put(
    recordForDb as unknown as BrochureSetup
  )
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('create', 'brochure_setup', id, {})
  }
}
