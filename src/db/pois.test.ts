import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import {
  getPOIsByTrailId,
  createPOI,
  getPOIById,
  deletePOI,
  updatePOI,
} from './pois'

describe('pois', () => {
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('creates and retrieves POI without loading blobs', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
      groupCode: 'clonfert',
      trailType: 'graveyard',
      sequence: 1,
      filename: 'clonfert-g-001.jpg',
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: 53.2041,
      longitude: -8.0619,
      accuracy: 8,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    expect(poi.id).toBe('clonfert-g-001')
    expect(poi.siteName).toBe('')
    expect(poi.completed).toBe(false)

    const retrieved = await getPOIById('clonfert-g-001', { includeBlobs: false })
    expect(retrieved?.id).toBe('clonfert-g-001')
    expect(retrieved?.photoBlob).toBeUndefined()
  })

  it('gets POIs by trail id', async () => {
    await createPOI({
      trailId: 'clonfert-graveyard',
      groupCode: 'clonfert',
      trailType: 'graveyard',
      sequence: 1,
      filename: 'clonfert-g-001.jpg',
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    const pois = await getPOIsByTrailId('clonfert-graveyard', {
      includeBlobs: false,
    })
    expect(pois).toHaveLength(1)
    expect(pois[0].id).toBe('clonfert-g-001')
  })

  it('updates POI and sets completed when siteName and story filled', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
      groupCode: 'clonfert',
      trailType: 'graveyard',
      sequence: 1,
      filename: 'clonfert-g-001.jpg',
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    await updatePOI(poi.id, {
      siteName: "Murphy's Gate",
      story: 'Historic gate at cemetery entrance with wrought iron details dating from the 1890s.',
    })

    const updated = await getPOIById(poi.id, { includeBlobs: false })
    expect(updated?.siteName).toBe("Murphy's Gate")
    expect(updated?.completed).toBe(true)
  })

  it('deletes POI', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
      groupCode: 'clonfert',
      trailType: 'graveyard',
      sequence: 1,
      filename: 'clonfert-g-001.jpg',
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: null,
      longitude: null,
      accuracy: null,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    await deletePOI(poi.id)
    const retrieved = await getPOIById(poi.id)
    expect(retrieved).toBeNull()
  })
})
