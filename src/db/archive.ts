import { supabase } from '../lib/supabase'
import { getStoredUserEmail } from '../utils/storage'

/**
 * Archives a trail in Supabase by setting archived = true and archived_at.
 * Throws if not logged in, Supabase unavailable, or update fails.
 */
export async function archiveTrailInSupabase(trailId: string): Promise<void> {
  const email = getStoredUserEmail()
  if (!email) {
    throw new Error('You must be logged in to archive a trail.')
  }

  if (!supabase) {
    throw new Error('You must be logged in to archive a trail.')
  }

  const archivedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('trails')
    .update({ archived: true, archived_at: archivedAt })
    .eq('id', trailId)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error('Trail not found in cloud. Sync your data first.')
  }
}
