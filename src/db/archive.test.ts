import { describe, it, expect, vi, beforeEach } from 'vitest'
import { archiveTrailInSupabase } from './archive'
import { getStoredUserEmail } from '../utils/storage'

let updatePayload: Record<string, unknown> | null = null
let eqColumn: string | null = null
let eqValue: string | null = null
let eqResult: { data: unknown; error: { message: string } | null } = {
  data: [{ id: 'test-graveyard' }],
  error: null,
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (data: Record<string, unknown>) => {
        updatePayload = data
        return {
          eq: (col: string, val: string) => {
            eqColumn = col
            eqValue = val
            return {
              select: () => Promise.resolve(eqResult),
            }
          },
        }
      },
    }),
  },
}))

vi.mock('../utils/storage', () => ({
  getStoredUserEmail: vi.fn(),
}))

describe('archiveTrailInSupabase', () => {
  beforeEach(() => {
    updatePayload = null
    eqColumn = null
    eqValue = null
    eqResult = { data: [{ id: 'test-graveyard' }], error: null }
    vi.mocked(getStoredUserEmail).mockReturnValue('test@example.com')
  })

  it('sets archived = true and archived_at in Supabase', async () => {
    await archiveTrailInSupabase('test-graveyard')

    expect(updatePayload).not.toBeNull()
    expect(updatePayload!.archived).toBe(true)
    expect(updatePayload!.archived_at).toBeDefined()
    expect(typeof updatePayload!.archived_at).toBe('string')
    expect(eqColumn).toBe('id')
    expect(eqValue).toBe('test-graveyard')
  })

  it('throws if not logged in', async () => {
    vi.mocked(getStoredUserEmail).mockReturnValue(null)

    await expect(archiveTrailInSupabase('test-graveyard')).rejects.toThrow(
      'You must be logged in to archive a trail.'
    )
  })

  it('throws if Supabase update fails', async () => {
    eqResult = { data: null, error: { message: 'Network error' } }

    await expect(archiveTrailInSupabase('test-graveyard')).rejects.toThrow()
  })
})
