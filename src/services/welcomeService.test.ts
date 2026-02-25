import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processWelcome } from './welcomeService'
import { db } from '../db/database'
import { getPOIById } from '../db/pois'

vi.mock('../lib/supabase', () => {
  const mockProfile = {
    email: 'jane@test.com',
    name: 'Jane',
    group_name: "Jane's recordings",
    group_code: 'jane',
  }
  const mockTrail = {
    id: 'jane-graveyard',
    group_code: 'jane',
    trail_type: 'graveyard',
    display_name: 'Jane Graveyard Trail',
    created_at: new Date().toISOString(),
    next_sequence: 2,
  }
  const mockPoi = {
    id: 'jane-g-001',
    trail_id: 'jane-graveyard',
    group_code: 'jane',
    trail_type: 'graveyard',
    sequence: 1,
    filename: 'test.jpg',
    photo_url: 'https://example.com/photo.jpg',
    thumbnail_url: 'https://example.com/thumb.jpg',
    latitude: null,
    longitude: null,
    accuracy: null,
    captured_at: new Date().toISOString(),
    site_name: '',
    category: 'Other',
    description: '',
    story: '',
    url: '',
    condition: 'Good',
    notes: '',
    completed: false,
    created_by: null,
    last_modified_by: null,
    last_modified_at: null,
  }
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- eq chain params
          eq: (col: string, val: unknown) => {
            if (table === 'user_profile') {
              return {
                single: () => Promise.resolve({ data: mockProfile }),
              }
            }
            if (table === 'trails') {
              return {
                eq: (col2: string, val2: unknown) => {
                  if (col2 === 'archived' && val2 === false) {
                    return Promise.resolve({ data: [mockTrail] })
                  }
                  return Promise.resolve({ data: [] })
                },
              }
            }
            if (table === 'pois') {
              return Promise.resolve({ data: [mockPoi] })
            }
            return Promise.resolve({ data: null })
          },
        }),
      }),
    },
  }
})

describe('welcomeService', () => {
  const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) // minimal JPEG header
  const photoArrayBuffer = photoBytes.buffer

  beforeEach(async () => {
    vi.clearAllMocks()
    await db.delete()
    await db.open()
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(photoArrayBuffer))
    ) as typeof fetch
  })

  it('stores POI photos as ArrayBuffer in IndexedDB during restore (iOS compatibility)', async () => {
    const result = await processWelcome('Jane', 'jane@test.com')

    expect(result.isReturningUser).toBe(true)
    expect(result.restoreMeta?.poiCount).toBe(1)

    const raw = await db.pois.get('jane-g-001')
    expect(raw).not.toBeUndefined()
    // Store ArrayBuffer (not Blob) for iOS IndexedDB compatibility
    expect(raw!.photoBlob).toBeDefined()
    expect(raw!.photoBlob).not.toBeInstanceOf(Blob)
    expect(Object.prototype.toString.call(raw!.photoBlob)).toBe(
      '[object ArrayBuffer]'
    )
    expect(raw!.thumbnailBlob).toBeDefined()
    expect(Object.prototype.toString.call(raw!.thumbnailBlob)).toBe(
      '[object ArrayBuffer]'
    )
  })

  it('restored POI can be read with getPOIById and blobs are usable', async () => {
    await processWelcome('Jane', 'jane@test.com')

    const poi = await getPOIById('jane-g-001', { includeBlobs: true })
    expect(poi).not.toBeNull()
    expect(poi!.photoBlob).toBeInstanceOf(Blob)
    expect(poi!.thumbnailBlob).toBeInstanceOf(Blob)
    expect(poi!.photoBlob.size).toBe(photoArrayBuffer.byteLength)
    expect(poi!.thumbnailBlob.size).toBe(photoArrayBuffer.byteLength)
  })
})
