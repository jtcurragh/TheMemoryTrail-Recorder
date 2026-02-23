import type { Trail, TrailType } from '../types'
import { db } from './database'
import { enqueueSync } from './syncQueue'
import { features } from '../config/features'
import { supabase } from '../lib/supabase'

function trailId(groupCode: string, trailType: TrailType): string {
  return `${groupCode}-${trailType}`
}

export async function getTrailById(id: string): Promise<Trail | undefined> {
  return db.trails.get(id)
}

export async function getTrailsByGroupCode(
  groupCode: string
): Promise<Trail[]> {
  return db.trails.where('groupCode').equals(groupCode).toArray()
}

export async function createTrail(input: {
  groupCode: string
  trailType: TrailType
  displayName: string
}): Promise<Trail> {
  const id = trailId(input.groupCode, input.trailType)
  const trail: Trail = {
    id,
    groupCode: input.groupCode,
    trailType: input.trailType,
    displayName: input.displayName,
    createdAt: new Date().toISOString(),
    nextSequence: 1,
  }
  await db.trails.add(trail)
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('create', 'trail', id, {})
  }
  return trail
}

export async function incrementTrailSequence(
  trailId: string
): Promise<number> {
  const trail = await db.trails.get(trailId)
  if (!trail) throw new Error(`Trail not found: ${trailId}`)
  const next = trail.nextSequence + 1
  await db.trails.update(trailId, { nextSequence: next })
  if (features.SUPABASE_SYNC_ENABLED && supabase) {
    void enqueueSync('update', 'trail', trailId, {})
  }
  return next
}

export async function resetTrail(trailId: string): Promise<void> {
  await db.pois.where('trailId').equals(trailId).delete()
  await db.trails.update(trailId, { nextSequence: 1 })
}
