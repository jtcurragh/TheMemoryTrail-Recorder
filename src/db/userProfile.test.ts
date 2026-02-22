import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import {
  getUserProfile,
  createUserProfile,
} from './userProfile'

describe('userProfile', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('creates and retrieves user profile', async () => {
    const profile = await createUserProfile({
      name: 'Sheila',
      groupName: 'Clonfert Trails',
      groupCode: 'clonfert',
    })

    expect(profile.id).toBeDefined()
    expect(profile.name).toBe('Sheila')
    expect(profile.groupName).toBe('Clonfert Trails')
    expect(profile.groupCode).toBe('clonfert')
    expect(profile.createdAt).toBeDefined()

    const retrieved = await getUserProfile()
    expect(retrieved).toEqual(profile)
  })

  it('returns null when no profile exists', async () => {
    const result = await getUserProfile()
    expect(result).toBeNull()
  })
})
