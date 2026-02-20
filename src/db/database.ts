import Dexie, { type Table } from 'dexie'
import type { UserProfile, Trail, POIRecord, BrochureSetup } from '../types'

const DB_NAME =
  import.meta.env?.MODE === 'test' ? 'tmt-recorder-test' : 'tmt-recorder'

class TMTDatabase extends Dexie {
  userProfile!: Table<UserProfile, string>
  trails!: Table<Trail, string>
  pois!: Table<POIRecord, string>
  brochureSetup!: Table<BrochureSetup, string>

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
  }
}

export const db = new TMTDatabase()
