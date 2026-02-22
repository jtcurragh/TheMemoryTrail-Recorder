import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import { getBrochureSetup, saveBrochureSetup } from './brochureSetup'

describe('brochureSetup', () => {
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns undefined when no setup exists', async () => {
    const result = await getBrochureSetup('clonfert-graveyard')
    expect(result).toBeUndefined()
  })

  it('saves and retrieves brochure setup with blobs', async () => {
    const setup = {
      id: 'clonfert-graveyard',
      trailId: 'clonfert-graveyard',
      coverTitle: 'Clonfert Trails Heritage Trail',
      coverPhotoBlob: mockBlob,
      groupName: 'Clonfert Tidy Towns',
      creditsText: 'Written by local historians.',
      introText: 'Welcome to our heritage trail.',
      funderLogos: [mockBlob],
      updatedAt: '2025-02-20T12:00:00Z',
    }

    await saveBrochureSetup(setup)
    const retrieved = await getBrochureSetup('clonfert-graveyard')

    expect(retrieved).toBeDefined()
    expect(retrieved?.coverTitle).toBe('Clonfert Trails Heritage Trail')
    expect(retrieved?.groupName).toBe('Clonfert Tidy Towns')
    expect(retrieved?.introText).toBe('Welcome to our heritage trail.')
    expect(retrieved?.creditsText).toBe('Written by local historians.')
    expect(retrieved?.coverPhotoBlob).toBeInstanceOf(Blob)
    expect(retrieved?.funderLogos).toHaveLength(1)
    expect(retrieved?.funderLogos[0]).toBeInstanceOf(Blob)
  })

  it('saves setup with null cover photo and empty funder logos', async () => {
    const setup = {
      id: 'clonfert-parish',
      trailId: 'clonfert-parish',
      coverTitle: 'Parish Trail',
      coverPhotoBlob: null as Blob | null,
      groupName: 'Clonfert Tidy Towns',
      creditsText: '',
      introText: 'Intro text.',
      funderLogos: [] as Blob[],
      updatedAt: '2025-02-20T12:00:00Z',
    }

    await saveBrochureSetup(setup)
    const retrieved = await getBrochureSetup('clonfert-parish')

    expect(retrieved).toBeDefined()
    expect(retrieved?.coverPhotoBlob).toBeNull()
    expect(retrieved?.funderLogos).toHaveLength(0)
  })

  it('overwrites existing setup on save', async () => {
    const setup1 = {
      id: 'clonfert-graveyard',
      trailId: 'clonfert-graveyard',
      coverTitle: 'Original Title',
      coverPhotoBlob: mockBlob,
      groupName: 'Group',
      creditsText: '',
      introText: 'Intro',
      funderLogos: [] as Blob[],
      updatedAt: '2025-02-20T12:00:00Z',
    }
    await saveBrochureSetup(setup1)

    const setup2 = {
      ...setup1,
      coverTitle: 'Updated Title',
      updatedAt: '2025-02-20T13:00:00Z',
    }
    await saveBrochureSetup(setup2)

    const retrieved = await getBrochureSetup('clonfert-graveyard')
    expect(retrieved?.coverTitle).toBe('Updated Title')
  })
})
