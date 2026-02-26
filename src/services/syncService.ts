/**
 * Supabase migration for archived trails (run manually in Supabase SQL Editor):
 *
 * ALTER TABLE trails
 * ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
 *
 * ALTER TABLE trails
 * ADD COLUMN IF NOT EXISTS archived_at timestamptz;
 */
import { supabase } from '../lib/supabase'
import { getStoredUserEmail } from '../utils/storage'
import { db } from '../db/database'
import { getPendingItems, getLastSyncedAt } from '../db/syncQueue'
import type { SyncQueueItem } from '../db/database'
import { getPOIById } from '../db/pois'
import { getTrailById } from '../db/trails'
import { getBrochureSetup } from '../db/brochureSetup'
import { getUserProfile } from '../db/userProfile'
import { features } from '../config/features'

const MAX_ATTEMPTS = 5

function toBlob(value: ArrayBuffer | Blob): Blob {
  if (value instanceof Blob) return value
  return new Blob([value])
}

async function uploadPOIPhoto(
  trailId: string,
  filename: string,
  blob: Blob | ArrayBuffer
): Promise<string> {
  if (!supabase) throw new Error('Supabase not available')
  const b = blob instanceof Blob ? blob : new Blob([blob])
  const path = `${trailId}/${filename}`
  const { error } = await supabase.storage
    .from('poi-photos')
    .upload(path, b, { upsert: true })
  if (error) throw error
  const { data: signedData } = await supabase.storage
    .from('poi-photos')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year
  return signedData?.signedUrl ?? path
}

async function uploadBrochureAsset(
  trailId: string,
  filename: string,
  blob: Blob | ArrayBuffer
): Promise<string> {
  if (!supabase) throw new Error('Supabase not available')
  const b = blob instanceof Blob ? blob : new Blob([blob])
  const path = `${trailId}/${filename}`
  const { error } = await supabase.storage
    .from('brochure-assets')
    .upload(path, b, { upsert: true })
  if (error) throw error
  const { data: signedData } = await supabase.storage
    .from('brochure-assets')
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  return signedData?.signedUrl ?? path
}

async function processTrail(item: SyncQueueItem): Promise<void> {
  if (!supabase) throw new Error('Supabase not available')
  const trail = await getTrailById(item.entityId)
  if (!trail && item.operation !== 'delete') {
    throw new Error(`Trail not found: ${item.entityId}`)
  }
  if (item.operation === 'delete') {
    const { error } = await supabase.from('trails').delete().eq('id', item.entityId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('trails').upsert(
    {
      id: trail!.id,
      group_code: trail!.groupCode,
      trail_type: trail!.trailType,
      display_name: trail!.displayName,
      next_sequence: trail!.nextSequence,
      created_at: trail!.createdAt,
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

async function processPOI(item: SyncQueueItem): Promise<void> {
  if (!supabase) throw new Error('Supabase not available')
  const poi = await getPOIById(item.entityId, { includeBlobs: true })
  if (!poi && item.operation !== 'delete') {
    throw new Error(`POI not found: ${item.entityId}`)
  }
  if (item.operation === 'delete') {
    const { error } = await supabase.from('pois').delete().eq('id', item.entityId)
    if (error) throw error
    return
  }
  const photoBlob = (poi as { photoBlob?: Blob | ArrayBuffer }).photoBlob
  const thumbnailBlob = (poi as { thumbnailBlob?: Blob | ArrayBuffer }).thumbnailBlob
  let photoUrl: string | null = null
  let thumbnailUrl: string | null = null
  if (photoBlob) {
    const photo = toBlob(photoBlob)
    photoUrl = await uploadPOIPhoto(poi!.trailId, poi!.filename, photo)
  }
  if (thumbnailBlob) {
    const thumb = toBlob(thumbnailBlob)
    thumbnailUrl = await uploadPOIPhoto(
      poi!.trailId,
      `thumb_${poi!.filename}`,
      thumb
    )
  }
  const { error } = await supabase.from('pois').upsert(
    {
      id: poi!.id,
      trail_id: poi!.trailId,
      group_code: poi!.groupCode,
      trail_type: poi!.trailType,
      sequence: poi!.sequence,
      filename: poi!.filename,
      photo_url: photoUrl,
      thumbnail_url: thumbnailUrl,
      latitude: poi!.latitude,
      longitude: poi!.longitude,
      accuracy: poi!.accuracy,
      captured_at: poi!.capturedAt,
      site_name: poi!.siteName,
      category: poi!.category,
      description: poi!.description,
      story: poi!.story,
      url: poi!.url,
      condition: poi!.condition,
      notes: poi!.notes,
      completed: poi!.completed,
      rotation: (poi!.rotation ?? 0) as number,
      created_by: poi!.createdBy ?? null,
      last_modified_by: poi!.lastModifiedBy ?? null,
      last_modified_at: poi!.lastModifiedAt ?? null,
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

async function processBrochureSetup(item: SyncQueueItem): Promise<void> {
  if (!supabase) throw new Error('Supabase not available')
  const setup = await getBrochureSetup(item.entityId)
  if (!setup && item.operation !== 'delete') {
    throw new Error(`Brochure setup not found: ${item.entityId}`)
  }
  if (item.operation === 'delete') {
    const { error } = await supabase
      .from('brochure_setup')
      .delete()
      .eq('id', item.entityId)
    if (error) throw error
    return
  }
  let coverPhotoUrl: string | null = null
  let mapUrl: string | null = null

  if (setup!.coverPhotoBlob) {
    coverPhotoUrl = await uploadBrochureAsset(
      setup!.trailId,
      'cover.jpg',
      setup!.coverPhotoBlob
    )
  }
  if (setup!.mapBlob) {
    mapUrl = await uploadBrochureAsset(
      setup!.trailId,
      'map.png',
      setup!.mapBlob
    )
  }

  const { error } = await supabase.from('brochure_setup').upsert(
    {
      id: setup!.id,
      trail_id: setup!.trailId,
      cover_title: setup!.coverTitle,
      cover_photo_url: coverPhotoUrl,
      group_name: setup!.groupName,
      funder_text: setup!.funderText,
      credits_text: setup!.creditsText,
      intro_text: setup!.introText,
      funder_logos_urls: [],
      map_url: mapUrl,
      updated_at: setup!.updatedAt,
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

async function processItem(item: SyncQueueItem): Promise<void> {
  switch (item.entityType) {
    case 'trail':
      await processTrail(item)
      break
    case 'poi':
      await processPOI(item)
      break
    case 'brochure_setup':
      await processBrochureSetup(item)
      break
    default:
      throw new Error(`Unknown entityType: ${(item as SyncQueueItem).entityType}`)
  }
}

export type SyncResult = {
  success: boolean
  syncedCount: number
  lastSyncedAt: string | null
  error: string | null
}

export async function runSync(): Promise<SyncResult> {
  if (!features.SUPABASE_SYNC_ENABLED || !supabase) {
    return {
      success: true,
      syncedCount: 0,
      lastSyncedAt: null,
      error: null,
    }
  }

  const email = getStoredUserEmail()
  if (!email) {
    return {
      success: true,
      syncedCount: 0,
      lastSyncedAt: null,
      error: null,
    }
  }

  const profile = await getUserProfile()
  if (profile) {
    await supabase!.from('user_profile').upsert(
      {
        email: profile.email,
        name: profile.name,
        group_name: profile.groupName,
        group_code: profile.groupCode,
      },
      { onConflict: 'email' }
    )
  }

  const pending = await getPendingItems()
  let syncedCount = 0
  let lastError: string | null = null

  for (const item of pending) {
    try {
      await processItem(item)
      await db.syncQueue.update(item.id, {
        syncedAt: new Date().toISOString(),
      })
      syncedCount++
    } catch (err) {
      const attempts = item.attempts + 1
      await db.syncQueue.update(item.id, { attempts })
      lastError =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err)
      if (attempts >= MAX_ATTEMPTS) {
        await db.syncQueue.update(item.id, {
          syncedAt: new Date().toISOString(),
          payload: {
            ...item.payload,
            _abandoned: true,
            _lastError: lastError,
          },
        })
      }
      break
    }
  }

  const lastSyncedAt = await getLastSyncedAt()

  return {
    success: lastError === null,
    syncedCount,
    lastSyncedAt,
    error: lastError,
  }
}
