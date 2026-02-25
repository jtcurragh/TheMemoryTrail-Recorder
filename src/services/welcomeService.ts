import { supabase } from '../lib/supabase'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { restoreBrochureSettingsFromSupabase } from './brochureSettingsService'
import { deriveGroupCode, deriveGroupCodeFromEmail } from '../utils/groupCode'
import type { UserProfile, Trail, POIRecord } from '../types'

/** Check if email exists in Supabase (returning user). */
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!supabase) return false
  const emailNorm = email.trim().toLowerCase()
  const { data } = await supabase
    .from('user_profile')
    .select('email')
    .eq('email', emailNorm)
    .single()
  return data != null
}

export interface WelcomeResult {
  isReturningUser: boolean
  profile: UserProfile
  restoreMeta?: {
    trailCount: number
    poiCount: number
    brochureSettingsCount: number
    failedPhotos: string[]
  }
}

export interface ProcessWelcomeOptions {
  onProgress?: (current: number, total: number) => void
  parishName?: string
  graveyardName?: string
}

/**
 * Check Supabase for existing user by email. If found, restore their data to Dexie.
 * If not found, create new profile and default trails.
 */
export async function processWelcome(
  name: string,
  email: string,
  options?: ProcessWelcomeOptions
): Promise<WelcomeResult> {
  const emailNorm = email.trim().toLowerCase()
  const nameTrim = name.trim()

  if (!supabase) {
    return createNewUserLocalOnly(nameTrim, emailNorm, options?.parishName, options?.graveyardName)
  }

  const { data: existingProfile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('email', emailNorm)
    .single()

  if (existingProfile) {
    return restoreReturningUser(existingProfile, nameTrim, emailNorm, {
      onProgress: options?.onProgress,
    })
  }

  return createNewUser(nameTrim, emailNorm, options?.parishName, options?.graveyardName)
}

async function createNewUserLocalOnly(
  name: string,
  email: string,
  parishName?: string,
  graveyardName?: string
): Promise<WelcomeResult> {
  const parish = parishName?.trim()
  const graveyard = graveyardName?.trim()
  const groupName = parish || `${name}'s recordings`
  const groupCode = parish
    ? deriveGroupCode(parish)
    : deriveGroupCodeFromEmail(email)
  const profile = await createUserProfile({
    email,
    name,
    groupName,
    groupCode,
    graveyardName: graveyard || undefined,
  })

  const graveyardDisplayName = graveyard
    ? `${graveyard} Graveyard Trail`
    : `${groupName} Graveyard Trail`
  const parishDisplayName = parish
    ? `${parish} Parish Trail`
    : `${groupName} Parish Trail`

  await createTrail({
    groupCode,
    trailType: 'graveyard',
    displayName: graveyardDisplayName,
  })
  await createTrail({
    groupCode,
    trailType: 'parish',
    displayName: parishDisplayName,
  })

  return { isReturningUser: false, profile }
}

async function createNewUser(
  name: string,
  email: string,
  parishName?: string,
  graveyardName?: string
): Promise<WelcomeResult> {
  const parish = parishName?.trim()
  const graveyard = graveyardName?.trim()
  const groupName = parish || `${name}'s recordings`
  const groupCode = parish
    ? deriveGroupCode(parish)
    : deriveGroupCodeFromEmail(email)
  const profile = await createUserProfile({
    email,
    name,
    groupName,
    groupCode,
    graveyardName: graveyard || undefined,
  })

  await supabase!.from('user_profile').upsert(
    {
      email: profile.email,
      name: profile.name,
      group_name: profile.groupName,
      group_code: profile.groupCode,
      graveyard_name: profile.graveyardName ?? null,
    },
    { onConflict: 'email' }
  )

  const graveyardDisplayName = graveyard
    ? `${graveyard} Graveyard Trail`
    : `${groupName} Graveyard Trail`
  const parishDisplayName = parish
    ? `${parish} Parish Trail`
    : `${groupName} Parish Trail`

  await createTrail({
    groupCode: profile.groupCode,
    trailType: 'graveyard',
    displayName: graveyardDisplayName,
  })
  await createTrail({
    groupCode: profile.groupCode,
    trailType: 'parish',
    displayName: parishDisplayName,
  })

  return { isReturningUser: false, profile }
}

interface RestoreOptions {
  onProgress?: (current: number, total: number) => void
}

async function restoreReturningUser(
  supabaseProfile: {
    email: string
    name: string
    group_name: string
    group_code: string
    graveyard_name?: string | null
  },
  name: string,
  email: string,
  options?: RestoreOptions
): Promise<WelcomeResult> {
  const profile = await createUserProfile({
    email,
    name: name || supabaseProfile.name,
    groupName: supabaseProfile.group_name,
    groupCode: supabaseProfile.group_code,
    graveyardName: supabaseProfile.graveyard_name ?? undefined,
  })

  const { data: trails } = await supabase!
    .from('trails')
    .select('*')
    .eq('group_code', profile.groupCode)

  const trailCount = trails?.length ?? 0
  const failedPhotos: string[] = []
  let poiCount = 0

  if (trails && trails.length > 0) {
    for (const t of trails) {
      const trail: Trail = {
        id: t.id,
        groupCode: t.group_code,
        trailType: t.trail_type as Trail['trailType'],
        displayName: t.display_name ?? '',
        createdAt: t.created_at ?? new Date().toISOString(),
        nextSequence: t.next_sequence ?? 1,
      }
      await db.trails.put(trail)
    }

    const { data: pois } = await supabase!
      .from('pois')
      .select('*')
      .eq('group_code', profile.groupCode)

    if (pois && pois.length > 0) {
      poiCount = pois.length
      const total = pois.length
      for (let i = 0; i < pois.length; i++) {
        const p = pois[i]
        options?.onProgress?.(i + 1, total)

        let photoBlob: ArrayBuffer | null = null
        let thumbnailBlob: ArrayBuffer | null = null
        let photoFailed = false

        if (p.photo_url) {
          try {
            const res = await fetch(p.photo_url)
            photoBlob = await res.arrayBuffer()
          } catch {
            photoFailed = true
          }
        }
        if (p.thumbnail_url) {
          try {
            const res = await fetch(p.thumbnail_url)
            thumbnailBlob = await res.arrayBuffer()
          } catch {
            photoFailed = true
          }
        }

        if (photoFailed) {
          failedPhotos.push(p.site_name || p.filename || p.id)
        }

        const photoBuf = photoBlob ?? new ArrayBuffer(0)
        const thumbBuf = thumbnailBlob ?? new ArrayBuffer(0)
        const recordForDb = {
          id: p.id,
          trailId: p.trail_id,
          groupCode: p.group_code,
          trailType: p.trail_type as POIRecord['trailType'],
          sequence: p.sequence ?? 0,
          filename: p.filename ?? '',
          photoBlob: photoBuf,
          thumbnailBlob: thumbBuf,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          capturedAt: p.captured_at ?? new Date().toISOString(),
          siteName: p.site_name ?? '',
          category: (p.category as POIRecord['category']) ?? 'Other',
          description: p.description ?? '',
          story: p.story ?? '',
          url: p.url ?? '',
          condition: (p.condition as POIRecord['condition']) ?? 'Good',
          notes: p.notes ?? '',
          completed: p.completed ?? false,
          rotation: ((p.rotation ?? 0) as 0 | 90 | 180 | 270),
          createdBy: p.created_by,
          lastModifiedBy: p.last_modified_by,
          lastModifiedAt: p.last_modified_at,
        }
        await db.pois.put(recordForDb as unknown as POIRecord)
      }
    }
  } else {
    const groupName = profile.groupName || profile.name
    await createTrail({
      groupCode: profile.groupCode,
      trailType: 'graveyard',
      displayName: `${groupName} Graveyard Trail`,
    })
    await createTrail({
      groupCode: profile.groupCode,
      trailType: 'parish',
      displayName: `${groupName} Parish Trail`,
    })
  }

  const brochureSettingsCount = await restoreBrochureSettingsFromSupabase(
    profile.email
  )

  return {
    isReturningUser: true,
    profile,
    restoreMeta: {
      trailCount,
      poiCount,
      brochureSettingsCount,
      failedPhotos,
    },
  }
}
