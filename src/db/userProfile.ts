import type { UserProfile } from '../types'
import { db } from './database'
import { deriveGroupCodeFromEmail } from '../utils/groupCode'

const USER_PROFILE_ID = 'default'

export async function getUserProfile(): Promise<UserProfile | null> {
  const profile = await db.userProfile.get(USER_PROFILE_ID)
  return profile ?? null
}

export async function createUserProfile(input: {
  email: string
  name: string
  groupName?: string
  groupCode?: string
  graveyardName?: string
}): Promise<UserProfile> {
  if (!input.email?.trim()) {
    throw new Error('Email is required')
  }
  const groupCode = input.groupCode ?? deriveGroupCodeFromEmail(input.email)
  const groupName = input.groupName ?? `${input.name}'s recordings`

  const profile: UserProfile = {
    id: USER_PROFILE_ID,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    groupName,
    groupCode,
    graveyardName: input.graveyardName,
    createdAt: new Date().toISOString(),
  }

  await db.userProfile.put(profile)
  return profile
}
