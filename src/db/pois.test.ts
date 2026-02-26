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
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: 53.2041,
      longitude: -8.0619,
      accuracy: 8,
      capturedAt: '2025-02-20T12:00:00Z',
    })

    expect(poi.id).toMatch(/^clonfert-g-\d{6}-\d{6}-\d{3}$/)
    expect(poi.filename).toBe(`${poi.id}.jpg`)
    expect(poi.siteName).toBe('')
    expect(poi.completed).toBe(false)

    const retrieved = await getPOIById(poi.id, { includeBlobs: false })
    expect(retrieved?.id).toBe(poi.id)
    expect(retrieved?.photoBlob).toBeUndefined()
  })

  it('gets POIs by trail id', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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

    const pois = await getPOIsByTrailId('clonfert-graveyard', {
      includeBlobs: false,
    })
    expect(pois).toHaveLength(1)
    expect(pois[0].id).toBe(poi.id)
  })

  it('updates POI and sets completed when siteName and story filled', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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

    await updatePOI(poi.id, {
      siteName: "Murphy's Gate",
      story: 'Historic gate at cemetery entrance with wrought iron details dating from the 1890s.',
    })

    const updated = await getPOIById(poi.id, { includeBlobs: false })
    expect(updated?.siteName).toBe("Murphy's Gate")
    expect(updated?.completed).toBe(true)
  })

  it('new POIs default to rotation 0', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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
    expect(poi.rotation).toBe(0)
    const retrieved = await getPOIById(poi.id, { includeBlobs: false })
    expect(retrieved?.rotation).toBe(0)
  })

  it('rotation value is saved to Dexie on update', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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
    await updatePOI(poi.id, { rotation: 90 })
    const updated = await getPOIById(poi.id, { includeBlobs: false })
    expect(updated?.rotation).toBe(90)
  })

  it('handles missing rotation gracefully (treat as 0)', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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
    const existing = await db.pois.get(poi.id)
    expect(existing).not.toBeUndefined()
    const { rotation: _r, ...recordWithoutRotation } = existing!
    void _r
    await db.pois.put(recordWithoutRotation as Parameters<typeof db.pois.put>[0])
    const raw = await db.pois.get(poi.id)
    expect(raw?.rotation).toBeUndefined()
    const retrieved = await getPOIById(poi.id, { includeBlobs: false })
    expect(retrieved?.rotation).toBe(0)
  })

  it('deletes POI', async () => {
    const poi = await createPOI({
      trailId: 'clonfert-graveyard',
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

    await deletePOI(poi.id)
    const retrieved = await getPOIById(poi.id)
    expect(retrieved).toBeNull()
  })
})
