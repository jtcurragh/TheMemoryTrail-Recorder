import Dexie, { type Table } from 'dexie'
import type { UserProfile, Trail, POIRecord, BrochureSetup } from '../types'

const DB_NAME =
  import.meta.env?.MODE === 'test' ? 'tmt-recorder-test' : 'tmt-recorder'

export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  entityType: 'trail' | 'poi' | 'brochure_setup'
  entityId: string
  payload: object
  createdAt: string
  syncedAt?: string | null
  attempts: number
}

class TMTDatabase extends Dexie {
  userProfile!: Table<UserProfile, string>
  trails!: Table<Trail, string>
  pois!: Table<POIRecord, string>
  brochureSetup!: Table<BrochureSetup, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      userProfile: 'id',
      trails: 'id, groupCode, [groupCode+trailType]',
      pois: 'id, trailId, [trailId+sequence]',
    })
    this.version(2).stores({
      brochureSetup: 'id',
    })
    this.version(3).stores({
      // No schema changes, just acknowledging POI type expansion for audit fields
    })
    this.version(4).stores({
      syncQueue: 'id, createdAt, syncedAt',
    })
  }
}

export const db = new TMTDatabase()
