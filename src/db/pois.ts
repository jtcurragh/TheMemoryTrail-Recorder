import type {
  POIRecord,
  CreatePOIInput,
  UpdatePOIInput,
  POICategory,
  POICondition,
} from '../types'
import { db } from './database'
import { enqueueSync } from './syncQueue'
import { generatePOIId } from '../utils/idGeneration'
import { features } from '../config/features'
import { supabase } from '../lib/supabase'

const DEFAULT_CATEGORY: POICategory = 'Other'
const DEFAULT_CONDITION: POICondition = 'Good'

/** Converts ArrayBuffer (new format) or Blob (legacy) to Blob for app use. */
function toBlob(value: ArrayBuffer | Blob): Blob {
  if (value instanceof Blob) return value
  return new Blob([value])
}

export async function getPOIById(
  id: string,
  options?: { includeBlobs?: boolean }
): Promise<POIRecord | null> {
  const raw = await db.pois.get(id)
  if (!raw) return null

  if (options?.includeBlobs === false) {
    const { photoBlob: _p, thumbnailBlob: _t, ...rest } = raw
    void _p
    void _t
    return { ...rest, photoBlob: undefined, thumbnailBlob: undefined } as unknown as POIRecord
  }
  return {
    ...raw,
    photoBlob: toBlob(raw.photoBlob as ArrayBuffer | Blob),
    thumbnailBlob: toBlob(raw.thumbnailBlob as ArrayBuffer | Blob),
  } as POIRecord
}

export async function getPOIsByTrailId(
  trailId: string,
  options?: { includeBlobs?: boolean }
): Promise<POIRecord[]> {
  const rawList = await db.pois.where('trailId').equals(trailId).toArray()

  if (options?.includeBlobs === false) {
    return rawList.map(({ photoBlob: _p, thumbnailBlob: _t, ...rest }) => {
      void _p
      void _t
      return { ...rest, photoBlob: undefined, thumbnailBlob: undefined }
    }) as unknown as POIRecord[]
  }
  return rawList.map((raw) => ({
    ...raw,
    photoBlob: toBlob(raw.photoBlob as ArrayBuffer | Blob),
    thumbnailBlob: toBlob(raw.thumbnailBlob as ArrayBuffer | Blob),
  })) as POIRecord[]
}

export async function createPOI(input: CreatePOIInput): Promise<POIRecord> {
  const id = generatePOIId(
    input.groupCode,
    input.trailType,
    input.sequence
  )

  const poi: POIRecord = {
    id,
    trailId: input.trailId,
    groupCode: input.groupCode,
    trailType: input.trailType,
    sequence: input.sequence,
    filename: input.filename,
    photoBlob: input.photoBlob,
    thumbnailBlob: input.thumbnailBlob,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    capturedAt: input.capturedAt,
    siteName: input.siteName ?? '',
    category: input.category ?? DEFAULT_CATEGORY,
    description: input.description ?? '',
    story: input.story ?? '',
    url: input.url ?? '',
    condition: input.condition ?? DEFAULT_CONDITION,
    notes: input.notes ?? '',
    completed: !!(input.siteName && input.story),
  }

  const [photoBuf, thumbBuf] = await Promise.all([
    input.photoBlob.arrayBuffer(),
    input.thumbnailBlob.arrayBuffer(),
  ])
  const recordForDb = {
    ...poi,
    photoBlob: photoBuf,
    thumbnailBlob: thumbBuf,
  }
  await db.pois.add(recordForDb as unknown as POIRecord)
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('create', 'poi', id, {})
  }
  return poi
}

export async function updatePOI(
  id: string,
  updates: UpdatePOIInput
): Promise<void> {
  const existing = await db.pois.get(id)
  if (!existing) throw new Error(`POI not found: ${id}`)

  const completed =
    'siteName' in updates || 'story' in updates
      ? !!(updates.siteName ?? existing.siteName) &&
        !!(updates.story ?? existing.story)
      : existing.completed

  await db.pois.update(id, { ...updates, completed })
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('update', 'poi', id, {})
  }
}

export async function deletePOI(id: string): Promise<void> {
  await db.pois.delete(id)
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('delete', 'poi', id, {})
  }
}

export async function reorderPOI(
  trailId: string,
  poiId: string,
  direction: 'up' | 'down'
): Promise<void> {
  const pois = await db.pois.where('trailId').equals(trailId).toArray()
  const sorted = pois.sort((a, b) => (a.sequence as number) - (b.sequence as number))
  const idx = sorted.findIndex((p) => p.id === poiId)
  if (idx < 0) throw new Error(`POI not found: ${poiId}`)
  const newIdx = direction === 'up' ? idx - 1 : idx + 1
  if (newIdx < 0 || newIdx >= sorted.length) return
  const reordered = [...sorted]
  const [moved] = reordered.splice(idx, 1)
  reordered.splice(newIdx, 0, moved)
  await db.transaction('rw', db.pois, async () => {
    for (let i = 0; i < reordered.length; i++) {
      await db.pois.update(reordered[i].id, { sequence: i + 1 })
      if (features.SUPABASE_SYNC_ENABLED && supabase) {
        void enqueueSync('update', 'poi', reordered[i].id, {})
      }
    }
  })
}
