import { describe, it, expect, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { createPOI } from '../db/pois'
import {
  exportTrailsToZip,
  getExportZipFilename,
} from './export'
import type { UserProfile, Trail } from '../types'

describe('export', () => {
  const mockBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
    type: 'image/jpeg',
  })

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('puts graveyard POI photos in graveyard/ subfolder', async () => {
    await createUserProfile({
      email: 'test@example.com',
      name: 'Test',
      groupName: 'Ardmore Tidy Towns',
      groupCode: 'ardmore',
    })
    const graveyard = await createTrail({
      groupCode: 'ardmore',
      trailType: 'graveyard',
      displayName: 'Ardmore Graveyard Trail',
    })
    await createPOI({
      trailId: graveyard.id,
      groupCode: 'ardmore',
      trailType: 'graveyard',
      sequence: 1,
      filename: 'ardmore-g-001.jpg',
      photoBlob: mockBlob,
      thumbnailBlob: mockBlob,
      latitude: 52.0,
      longitude: -7.0,
      accuracy: 10,
      capturedAt: new Date().toISOString(),
    })

    const trails = await db.trails.where('groupCode').equals('ardmore').toArray()
    const zipBlob = await exportTrailsToZip(trails)
    const zip = await JSZip.loadAsync(zipBlob)
    const fileNames = Object.keys(zip.files).filter((n) => !n.endsWith('/'))

    expect(fileNames).toContain('graveyard/ardmore-g-001.jpg')
    expect(fileNames).not.toContain('ardmore-g-001.jpg')
  })

  it('uses parish name (profile.groupName) for ZIP filename, not user name', () => {
    const profile: UserProfile = {
      id: 'default',
      email: 'test@example.com',
      name: 'Sheila Murphy',
      groupName: 'Ardmore',
      groupCode: 'ardmore',
      createdAt: new Date().toISOString(),
    }
    const trails: Trail[] = [
      {
        id: 'ardmore-graveyard',
        groupCode: 'ardmore',
        trailType: 'graveyard',
        displayName: "St. Declan's Graveyard Trail",
        createdAt: new Date().toISOString(),
        nextSequence: 2,
      },
      {
        id: 'ardmore-parish',
        groupCode: 'ardmore',
        trailType: 'parish',
        displayName: 'Ardmore Parish Trail',
        createdAt: new Date().toISOString(),
        nextSequence: 1,
      },
    ]

    const filename = getExportZipFilename(profile, trails)

    expect(filename).toBe('ardmore_historic_graves_trail_export.zip')
    expect(filename).not.toContain('sheila')
  })
})
