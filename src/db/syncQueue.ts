import { db } from './database'
import type { SyncQueueItem } from './database'

export type { SyncQueueItem } from './database'

export async function enqueueSync(
  operation: SyncQueueItem['operation'],
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  payload: object = {}
): Promise<void> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    operation,
    entityType,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    syncedAt: undefined,
    attempts: 0,
  }
  await db.syncQueue.add(item)
}

export async function getPendingSyncCount(): Promise<number> {
  const all = await db.syncQueue.toArray()
  return all.filter((i) => i.syncedAt == null || i.syncedAt === '').length
}

export interface PendingEntityStats {
  poiCount: number
  trailCount: number
  brochureSetupCount: number
}

export async function getPendingEntityStats(): Promise<PendingEntityStats> {
  const pending = await db.syncQueue
    .filter((i) => i.syncedAt == null || i.syncedAt === '')
    .toArray()
  const poiIds = new Set<string>()
  const trailIds = new Set<string>()
  const brochureSetupIds = new Set<string>()
  for (const item of pending) {
    if (item.entityType === 'poi') poiIds.add(item.entityId)
    else if (item.entityType === 'trail') trailIds.add(item.entityId)
    else if (item.entityType === 'brochure_setup')
      brochureSetupIds.add(item.entityId)
  }
  return {
    poiCount: poiIds.size,
    trailCount: trailIds.size,
    brochureSetupCount: brochureSetupIds.size,
  }
}

export async function getLastSyncedAt(): Promise<string | null> {
  const all = await db.syncQueue.toArray()
  const synced = all
    .filter((i) => i.syncedAt != null && i.syncedAt !== '')
    .sort(
      (a, b) =>
        new Date(b.syncedAt!).getTime() - new Date(a.syncedAt!).getTime()
    )
  return synced[0]?.syncedAt ?? null
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const all = await db.syncQueue.toArray()
  return all
    .filter((i) => i.syncedAt == null || i.syncedAt === '')
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
}

export interface SyncedStats {
  poiCount: number
  trailCount: number
}

/**
 * Derive trailId from POI id.
 * Supports legacy format (groupCode-g|p-nnn) and new format (groupCode-g|p-DDMMYY-HHmmss-SSS).
 */
function trailIdFromPoiId(poiId: string): string {
  const legacyMatch = poiId.match(/^(.+)-(g|p)-\d{3}$/)
  if (legacyMatch) {
    const [, groupCode, suffix] = legacyMatch
    const trailType = suffix === 'g' ? 'graveyard' : 'parish'
    return `${groupCode}-${trailType}`
  }
  const newMatch = poiId.match(/^(.+)-(g|p)-\d{6}-\d{6}-\d{3}$/)
  if (!newMatch) return poiId
  const [, groupCode, suffix] = newMatch
  const trailType = suffix === 'g' ? 'graveyard' : 'parish'
  return `${groupCode}-${trailType}`
}

export async function getSyncedStats(): Promise<SyncedStats> {
  const all = await db.syncQueue.toArray()
  const synced = all.filter((i) => i.syncedAt != null && i.syncedAt !== '')

  const poiCount = synced.filter((i) => i.entityType === 'poi').length
  const trailIds = new Set<string>()

  for (const item of synced) {
    if (item.entityType === 'trail') {
      trailIds.add(item.entityId)
    } else if (item.entityType === 'poi') {
      trailIds.add(trailIdFromPoiId(item.entityId))
    }
  }

  return {
    poiCount,
    trailCount: trailIds.size,
  }
}
