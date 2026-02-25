import { describe, it, expect, beforeEach } from 'vitest'
import { processWelcome } from './welcomeService'
import { db } from '../db/database'
import { getTrailsByGroupCode } from '../db/trails'

vi.mock('../lib/supabase', () => ({ supabase: null }))

describe('welcomeService two-name flow', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('sets graveyard trail displayName from graveyardName', async () => {
    await processWelcome('Sheila', 'sheila@example.com', {
      graveyardName: "St. Declan's",
      parishName: 'Ardmore',
    })

    const trails = await getTrailsByGroupCode('ardmore')
    const graveyard = trails.find((t) => t.trailType === 'graveyard')
    expect(graveyard?.displayName).toBe("St. Declan's Graveyard Trail")
  })

  it('sets parish trail displayName from parishName', async () => {
    await processWelcome('Sheila', 'sheila@example.com', {
      graveyardName: "St. Declan's",
      parishName: 'Ardmore',
    })

    const trails = await getTrailsByGroupCode('ardmore')
    const parish = trails.find((t) => t.trailType === 'parish')
    expect(parish?.displayName).toBe('Ardmore Parish Trail')
  })

  it('derives groupCode from parish name not graveyard name', async () => {
    await processWelcome('Sheila', 'sheila@example.com', {
      graveyardName: "St. Declan's",
      parishName: 'Clonfert',
    })

    const trails = await getTrailsByGroupCode('clonfert')
    expect(trails.length).toBe(2)
    expect(trails[0]?.id).toMatch(/^clonfert-/)
  })
})
