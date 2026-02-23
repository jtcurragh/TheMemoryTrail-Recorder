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
 * Derive trailId from POI id (format: groupCode-g|p-nnn -> groupCode-graveyard|parish)
 */
function trailIdFromPoiId(poiId: string): string {
  const match = poiId.match(/^(.+)-(g|p)-\d+$/)
  if (!match) return poiId
  const [, groupCode, suffix] = match
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
