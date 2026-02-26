import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import { createPOI } from './pois'
import {
  getTrailsByGroupCode,
  createTrail,
  getTrailById,
  incrementTrailSequence,
  resetTrail,
} from './trails'

describe('trails', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('creates trail and retrieves by id', async () => {
    const trail = await createTrail({
      groupCode: 'clonfert',
      trailType: 'graveyard',
      displayName: 'Clonfert Graveyard Trail',
    })

    expect(trail.id).toBe('clonfert-graveyard')
    expect(trail.nextSequence).toBe(1)

    const retrieved = await getTrailById('clonfert-graveyard')
    expect(retrieved).toEqual(trail)
  })

  it('gets trails by group code', async () => {
    await createTrail({
      groupCode: 'clonfert',
      trailType: 'graveyard',
      displayName: 'Clonfert Graveyard Trail',
    })
    await createTrail({
      groupCode: 'clonfert',
      trailType: 'parish',
      displayName: 'Clonfert Parish Trail',
    })

    const trails = await getTrailsByGroupCode('clonfert')
    expect(trails).toHaveLength(2)
    expect(trails.map((t) => t.trailType).sort()).toEqual(['graveyard', 'parish'])
  })

  it('increments nextSequence', async () => {
    await createTrail({
      groupCode: 'clonfert',
      trailType: 'graveyard',
      displayName: 'Clonfert Graveyard Trail',
    })

    const next = await incrementTrailSequence('clonfert-graveyard')
    expect(next).toBe(2)

    const trail = await getTrailById('clonfert-graveyard')
    expect(trail?.nextSequence).toBe(2)
  })

  it('resets trail by deleting POIs and resetting nextSequence', async () => {
    const trail = await createTrail({
      groupCode: 'clonfert',
      trailType: 'graveyard',
      displayName: 'Clonfert Graveyard Trail',
    })
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' })
    await createPOI({
      trailId: trail.id,
      groupCode: 'clonfert',
      trailType: 'graveyard',
      sequence: 1,
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    await resetTrail(trail.id)

    const pois = await db.pois.where('trailId').equals(trail.id).toArray()
    expect(pois).toHaveLength(0)

    const updatedTrail = await getTrailById(trail.id)
    expect(updatedTrail?.nextSequence).toBe(1)
  })
})
