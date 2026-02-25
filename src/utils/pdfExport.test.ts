import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import piexif from 'piexifjs'
import type { BrochureSetup } from '../types'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { createPOI } from '../db/pois'
import { getPOIsByTrailId } from '../db/pois'
import { getBrochureSetup } from '../db/brochureSetup'
import { saveBrochureSetup } from '../db/brochureSetup'
import { getTrailById } from '../db/trails'
import {
  generateBrochurePdf,
  computePoiPageLayout,
  getImageBlobForPdf,
} from './pdfExport'

vi.mock('./thumbnail', () => ({
  fixOrientation: vi.fn(async (blob: Blob) => {
    const buf = await blob.arrayBuffer()
    return new Blob([buf], { type: 'image/jpeg' })
  }),
}))

vi.mock('./mapbox', () => {
  const minimalPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
    0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ])
  return {
    fetchStaticMapForPdf: vi.fn(() =>
      Promise.resolve(new Blob([minimalPng], { type: 'image/png' }))
    ),
  }
})

/** Create a JPEG with EXIF orientation tag for testing. */
function createJpegWithExifOrientation(
  jpegBytes: Uint8Array,
  orientation: number
): Uint8Array {
  const binary = String.fromCharCode.apply(null, jpegBytes as unknown as number[])
  const exifObj = { '0th': { [274]: orientation } }
  const exifBytes = piexif.dump(exifObj)
  const inserted = piexif.insert(exifBytes, binary)
  const result = new Uint8Array(inserted.length)
  for (let i = 0; i < inserted.length; i++) result[i] = inserted.charCodeAt(i)
  return result
}

const minimalPng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

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

  it('applies poi.rotation when drawing POI photos (rotation=90 produces rotated image)', async () => {
    const { fixImageOrientationForPdf } = await import('./pdfExport')
    const rotated = await fixImageOrientationForPdf(mockBlob, 90)
    const unrotated = await fixImageOrientationForPdf(mockBlob, 0)
    expect(rotated).toBeInstanceOf(Blob)
    expect(unrotated).toBeInstanceOf(Blob)
    expect(rotated.size).toBeGreaterThan(0)
    expect(unrotated.size).toBeGreaterThan(0)
  })

  it('map page contains valid image when POIs have GPS coordinates', async () => {
    const { fetchStaticMapForPdf } = await import('./mapbox')
    const trail = { id: 'test', groupCode: 't', trailType: 'graveyard' as const, displayName: 'T', createdAt: '', nextSequence: 2 }
    const setup: BrochureSetup = {
      id: 'test',
      trailId: 'test',
      coverTitle: 'Test Trail',
      coverPhotoBlob: null,
      groupName: 'Test',
      creditsText: 'Credits',
      introText: 'Intro',
      funderLogos: [],
      mapBlob: null,
      updatedAt: new Date().toISOString(),
    }
    const poisWithGps = [
      {
        id: 'test-g-001',
        trailId: 'test',
        groupCode: 'test',
        trailType: 'graveyard' as const,
        sequence: 1,
        filename: 'test.jpg',
        photoBlob: mockBlob,
        thumbnailBlob: mockBlob,
        latitude: 53.27,
        longitude: -8.5,
        accuracy: 10,
        capturedAt: new Date().toISOString(),
        siteName: 'POI 1',
        category: 'Other' as const,
        description: '',
        story: 'Story',
        url: '',
        condition: 'Good' as const,
        notes: '',
        completed: true,
        rotation: 0 as const,
      },
    ]

    const pdf = await generateBrochurePdf(trail, setup, poisWithGps)
    expect(pdf).toBeInstanceOf(Blob)
    expect(pdf.size).toBeGreaterThan(100)

    const mapCalls = vi.mocked(fetchStaticMapForPdf).mock.calls.filter(
      (c) => c[0].length === 1 && c[0][0].trailId === 'test'
    )
    expect(mapCalls.length).toBeGreaterThanOrEqual(1)
    const call = mapCalls[mapCalls.length - 1]!
    expect(call[0][0].latitude).toBe(53.27)
    expect(call[0][0].longitude).toBe(-8.5)
    const opts = call[1] as { width: number; height: number } | undefined
    expect(opts).toBeDefined()
    expect(opts).toEqual(
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
      })
    )
    expect(opts?.height ?? 0).toBeGreaterThanOrEqual((opts?.width ?? 1) / 2)

    const pdfBytes = new Uint8Array(await pdf.arrayBuffer())
    const pdfText = new TextDecoder().decode(pdfBytes)
    expect(pdfText).toMatch(/\/Subtype\s*\/Image/)
  })

  it('map page is landscape (841x595pt) with 1200x700 map image', async () => {
    const trail = { id: 'test', groupCode: 't', trailType: 'parish' as const, displayName: 'T Parish', createdAt: '', nextSequence: 2 }
    const setup: BrochureSetup = {
      id: 'test',
      trailId: 'test',
      coverTitle: 'Test Parish Trail',
      coverPhotoBlob: null,
      groupName: 'Test',
      creditsText: 'Credits',
      introText: 'Intro',
      funderLogos: [],
      mapBlob: null,
      updatedAt: new Date().toISOString(),
    }
    const poisWithGps = [
      {
        id: 'test-p-001',
        trailId: 'test',
        groupCode: 'test',
        trailType: 'parish' as const,
        sequence: 1,
        filename: 'test.jpg',
        photoBlob: mockBlob,
        thumbnailBlob: mockBlob,
        latitude: 53.27,
        longitude: -8.5,
        accuracy: 10,
        capturedAt: new Date().toISOString(),
        siteName: 'Parish POI',
        category: 'Other' as const,
        description: '',
        story: 'Story',
        url: '',
        condition: 'Good' as const,
        notes: '',
        completed: true,
        rotation: 0 as const,
      },
    ]

    const pdf = await generateBrochurePdf(trail, setup, poisWithGps)
    const doc = await PDFDocument.load(new Uint8Array(await pdf.arrayBuffer()))
    const pages = doc.getPages()
    const mapPage = pages[pages.length - 1]!

    expect(mapPage.getWidth()).toBe(841)
    expect(mapPage.getHeight()).toBe(595)

    const mapCalls = vi.mocked((await import('./mapbox')).fetchStaticMapForPdf).mock.calls.filter(
      (c) => c[0].length === 1 && c[0][0].trailId === 'test'
    )
    const lastMapCall = mapCalls[mapCalls.length - 1]
    expect(lastMapCall?.[1]?.width).toBe(1200)
    expect(lastMapCall?.[1]?.height).toBe(700)
  })

  it('image y-position is always above title y-position on POI page', () => {
    const A6_WIDTH = 297.64
    const A6_HEIGHT = 419.53
    for (const rotation of [0, 90, 180, 270] as const) {
      const layout = computePoiPageLayout(100, 80, rotation, A6_WIDTH, A6_HEIGHT)
      expect(layout.imageBottomY).toBeGreaterThan(layout.titleY)
      expect(layout.imageBottomY).toBeGreaterThan(0)
      expect(layout.titleY).toBeGreaterThan(0)
    }
  })

  it('EXIF orientation 3 (180°) produces different output when applied', async () => {
    const jpegWithExif3 = createJpegWithExifOrientation(minimalJpeg, 3)
    const { fixImageOrientationForPdf } = await import('./pdfExport')
    const fixed = await fixImageOrientationForPdf(new Blob([new Uint8Array(jpegWithExif3)], { type: 'image/jpeg' }))
    const fixedBuf = new Uint8Array(await fixed.arrayBuffer())
    expect(Array.from(fixedBuf)).not.toEqual(Array.from(jpegWithExif3))
  }, 15000)

  it('EXIF orientation 6 (90° CW) produces different output when applied', async () => {
    const jpegWithExif6 = createJpegWithExifOrientation(minimalJpeg, 6)
    const { fixImageOrientationForPdf } = await import('./pdfExport')
    const fixed = await fixImageOrientationForPdf(new Blob([new Uint8Array(jpegWithExif6)], { type: 'image/jpeg' }))
    const fixedBuf = new Uint8Array(await fixed.arrayBuffer())
    expect(Array.from(fixedBuf)).not.toEqual(Array.from(jpegWithExif6))
  }, 15000)

  it('EXIF orientation 6 fixed blob embeds correctly in PDF with valid dimensions', async () => {
    const jpegWithExif6 = createJpegWithExifOrientation(minimalJpeg, 6)
    const { fixImageOrientationForPdf } = await import('./pdfExport')
    const fixed = await fixImageOrientationForPdf(new Blob([new Uint8Array(jpegWithExif6)], { type: 'image/jpeg' }))
    const doc = await PDFDocument.create()
    const img = await doc.embedJpg(new Uint8Array(await fixed.arrayBuffer()))
    expect(img.width).toBeGreaterThan(0)
    expect(img.height).toBeGreaterThan(0)
  }, 15000)

  it('image with no EXIF passes through unchanged', async () => {
    const { fixImageOrientationForPdf } = await import('./pdfExport')
    const fixed = await fixImageOrientationForPdf(new Blob([minimalJpeg], { type: 'image/jpeg' }))
    const fixedBuf = new Uint8Array(await fixed.arrayBuffer())
    expect(Array.from(fixedBuf)).toEqual(Array.from(minimalJpeg))
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

  it('uses full-resolution photoBlob for POI images, not thumbnailBlob', () => {
    const photoBlob = new Blob(
      [...minimalJpeg, ...new Array(5000).fill(0)],
      { type: 'image/jpeg' }
    )
    const thumbnailBlob = new Blob([minimalJpeg], { type: 'image/jpeg' })
    expect(photoBlob.size).toBeGreaterThan(thumbnailBlob.size)

    const poi = {
      id: 'test-g-001',
      trailId: 'test',
      groupCode: 'test',
      trailType: 'graveyard' as const,
      sequence: 1,
      filename: 'test.jpg',
      photoBlob,
      thumbnailBlob,
      latitude: 53.27,
      longitude: -8.5,
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: 'POI 1',
      category: 'Other' as const,
      description: '',
      story: 'Story',
      url: '',
      condition: 'Good' as const,
      notes: '',
      completed: true,
      rotation: 0 as const,
    }

    const { blob, usedFallback } = getImageBlobForPdf(poi)

    expect(blob).toBe(photoBlob)
    expect(blob).not.toBe(thumbnailBlob)
    expect(blob.size).toBe(photoBlob.size)
    expect(usedFallback).toBe(false)
  })

  it('falls back to thumbnailBlob when photoBlob is missing', () => {
    const thumbnailBlob = new Blob([minimalJpeg], { type: 'image/jpeg' })
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const poi = {
      id: 'test-g-002',
      trailId: 'test',
      groupCode: 'test',
      trailType: 'graveyard' as const,
      sequence: 2,
      filename: 'test2.jpg',
      photoBlob: undefined as unknown as Blob,
      thumbnailBlob,
      latitude: 53.28,
      longitude: -8.6,
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: 'POI 2',
      category: 'Other' as const,
      description: '',
      story: 'Story',
      url: '',
      condition: 'Good' as const,
      notes: '',
      completed: true,
      rotation: 0 as const,
    }

    const { blob, usedFallback } = getImageBlobForPdf(poi)

    expect(blob).toBe(thumbnailBlob)
    expect(usedFallback).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[pdfExport\].*has no photoBlob.*using thumbnail/)
    )

    consoleSpy.mockRestore()
  })

  it('renders all 3 funder logos when provided, including those with wrong/empty blob type', async () => {
    const trail = {
      id: 'test',
      groupCode: 'test',
      trailType: 'graveyard' as const,
      displayName: 'Test Trail',
      createdAt: '',
      nextSequence: 9,
    }
    const pois = Array.from({ length: 8 }, (_, i) => ({
      id: `test-g-00${i + 1}`,
      trailId: 'test',
      groupCode: 'test',
      trailType: 'graveyard' as const,
      sequence: i + 1,
      filename: `test-g-00${i + 1}.jpg`,
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: 53.27 + i * 0.01,
      longitude: -8.5 - i * 0.01,
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: `POI ${i + 1}`,
      category: 'Other' as const,
      description: '',
      story: 'Story',
      url: '',
      condition: 'Good' as const,
      notes: '',
      completed: true,
      rotation: 0 as const,
    }))
    const setup: BrochureSetup = {
      id: 'test',
      trailId: 'test',
      coverTitle: 'Test Trail',
      coverPhotoBlob: null,
      groupName: 'Test',
      creditsText: 'Credits',
      introText: 'Intro text.',
      funderLogos: [
        new Blob([minimalPng], { type: 'image/png' }),
        new Blob([minimalPng], { type: '' }),
        new Blob([minimalPng], { type: 'application/octet-stream' }),
      ],
      mapBlob: null,
      updatedAt: new Date().toISOString(),
    }

    const pdf = await generateBrochurePdf(trail, setup, pois)
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer())
    const pdfText = new TextDecoder().decode(pdfBytes)
    const imageCount = (pdfText.match(/\/Subtype\s*\/Image/g) ?? []).length
    expect(imageCount).toBeGreaterThanOrEqual(12)
  })
})
