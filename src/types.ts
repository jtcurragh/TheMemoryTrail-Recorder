export type TrailType = 'graveyard' | 'parish'

export type POICategory =
  | 'Monument'
  | 'Vernacular Building'
  | 'Holy Well'
  | 'Famine Site'
  | 'Historic Feature'
  | 'Natural Feature'
  | 'Grave'
  | 'Wrought Iron Gate'
  | 'Timber Gate'
  | 'Gate Piers'
  | 'Creamery Stand'
  | 'Stone Bridge'
  | 'Iron Bridge'
  | 'Timber Bridge'
  | 'Boreen'
  | 'Sruthán'
  | 'Stream'
  | 'River'
  | 'Lime Kiln'
  | 'Shed'
  | 'Post Box'
  | 'Phone Box'
  | 'Petrol Pump'
  | 'Ambush Site'
  | 'Battle Site'
  | 'Other'

export type POICondition =
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'At Risk'

export type PhotoRotation = 0 | 90 | 180 | 270

export interface UserProfile {
  id: string
  email: string
  name: string
  groupName: string
  groupCode: string
  graveyardName?: string
  createdAt: string
}

export interface Trail {
  id: string
  groupCode: string
  trailType: TrailType
  displayName: string
  createdAt: string
  nextSequence: number
}

export interface POIRecord {
  id: string
  trailId: string
  groupCode: string
  trailType: TrailType
  sequence: number
  filename: string
  photoBlob: Blob
  thumbnailBlob: Blob
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  capturedAt: string
  siteName: string
  category: POICategory
  description: string
  story: string
  url: string
  condition: POICondition
  notes: string
  completed: boolean
  rotation: PhotoRotation
  createdBy?: string
  lastModifiedBy?: string
  lastModifiedAt?: string
}

export interface CreatePOIInput {
  trailId: string
  groupCode: string
  trailType: TrailType
  sequence: number
  /** @deprecated Filename is generated from POI ID — ignored if provided */
  filename?: string
  photoBlob: Blob
  thumbnailBlob: Blob
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  capturedAt: string
  siteName?: string
  category?: POICategory
  description?: string
  story?: string
  url?: string
  condition?: POICondition
  notes?: string
  createdBy?: string
  lastModifiedBy?: string
  lastModifiedAt?: string
}

export interface UpdatePOIInput {
  siteName?: string
  category?: POICategory
  description?: string
  story?: string
  url?: string
  condition?: POICondition
  notes?: string
  rotation?: PhotoRotation
}

export interface BrochureSetup {
  id: string
  trailId: string
  coverTitle: string
  coverPhotoBlob: Blob | null
  groupName: string
  funderText: string
  creditsText: string
  introText: string
  mapBlob: Blob | null
  updatedAt: string
}
