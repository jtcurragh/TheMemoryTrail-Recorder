import type { UserProfile } from '../types'
import { db } from './database'

const USER_PROFILE_ID = 'default'

export async function getUserProfile(): Promise<UserProfile | null> {
  const profile = await db.userProfile.get(USER_PROFILE_ID)
  return profile ?? null
}

export async function createUserProfile(input: {
  name: string
  groupName: string
  groupCode: string
}): Promise<UserProfile> {
  const profile: UserProfile = {
    id: crypto.randomUUID(),
    name: input.name,
    groupName: input.groupName,
    groupCode: input.groupCode,
    createdAt: new Date().toISOString(),
  }

  await db.userProfile.put({
    ...profile,
    id: USER_PROFILE_ID,
  })

  return { ...profile, id: USER_PROFILE_ID }
}
