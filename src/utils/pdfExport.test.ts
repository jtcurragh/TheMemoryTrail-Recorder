import { describe, it, expect, beforeEach } from 'vitest'
import type { BrochureSetup } from '../types'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { createPOI } from '../db/pois'
import { getPOIsByTrailId } from '../db/pois'
import { getBrochureSetup } from '../db/brochureSetup'
import { saveBrochureSetup } from '../db/brochureSetup'
import { getTrailById } from '../db/trails'
import { generateBrochurePdf } from './pdfExport'

const minimalJpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0x7b, 0x65, 0xa7, 0xff, 0xd9,
])
const mockBlob = new Blob([minimalJpeg], { type: 'image/jpeg' })

describe('pdfExport', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('generates a PDF blob', async () => {
    await createUserProfile({
      email: 'test@example.com',
      name: 'Test',
      groupName: 'Test Parish',
      groupCode: 'test',
    })
    await createTrail({
      groupCode: 'test',
      trailType: 'graveyard',
      displayName: 'Test Graveyard Trail',
    })
    for (let i = 0; i < 8; i++) {
      await createPOI({
        trailId: 'test-graveyard',
        groupCode: 'test',
        trailType: 'graveyard',
        sequence: i + 1,
        filename: `test-g-00${i + 1}.jpg`,
        photoBlob: mockBlob,
        thumbnailBlob: mockBlob,
        latitude: 53 + i * 0.01,
        longitude: -8 - i * 0.01,
        accuracy: 10,
        capturedAt: '2025-02-20T12:00:00Z',
        siteName: `POI ${i + 1}`,
        description: 'Description',
        story: 'Story',
      })
    }

    await saveBrochureSetup({
      id: 'test-graveyard',
      trailId: 'test-graveyard',
      coverTitle: 'Test Heritage Trail',
      coverPhotoBlob: mockBlob,
      groupName: 'Test Parish',
      creditsText: 'Credits',
      introText: 'Introduction text.',
      funderLogos: [],
      mapBlob: null,
      updatedAt: '2025-02-20T12:00:00Z',
    })

    const trail = await getTrailById('test-graveyard')
    const setup = await getBrochureSetup('test-graveyard')
    const pois = await getPOIsByTrailId('test-graveyard', { includeBlobs: true })
    if (!trail || !setup) throw new Error('Missing data')

    const pdf = await generateBrochurePdf(trail, setup, pois)
    expect(pdf).toBeInstanceOf(Blob)
    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeGreaterThan(100)
  })

  it('generates PDF with text-only cover when photo is missing', async () => {
    const setup: Omit<BrochureSetup, 'coverPhotoBlob'> & { coverPhotoBlob: null } = {
      id: 'test',
      trailId: 'test',
      coverTitle: 'Test Heritage Trail',
      coverPhotoBlob: null,
      groupName: 'Test Community',
      creditsText: 'Credits text',
      introText: 'Introduction text about the trail',
      funderLogos: [],
      mapBlob: null,
      updatedAt: '2025-02-20T12:00:00Z',
    }
    const trail = { id: 'test', groupCode: 't', trailType: 'graveyard' as const, displayName: 'T', createdAt: '', nextSequence: 1 }
    
    const pdf = await generateBrochurePdf(trail, setup as BrochureSetup, [])
    expect(pdf).toBeInstanceOf(Blob)
    expect(pdf.type).toBe('application/pdf')
    expect(pdf.size).toBeGreaterThan(100)
  })
})
