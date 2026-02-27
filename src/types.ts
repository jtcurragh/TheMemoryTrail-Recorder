export type TrailType = 'graveyard' | 'parish'

import type { ParishCategoryLabel, GraveyardCategoryLabel } from './config/categories'

/** POI category. Uses labels from PARISH_CATEGORIES or GRAVEYARD_CATEGORIES. Legacy values still valid. */
export type POICategory = ParishCategoryLabel | GraveyardCategoryLabel | string

export type POICondition =
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'At Risk'

export type PhotoRotation = 0 | 90 | 180 | 270

/** How the POI's coordinates were obtained: exif (image EXIF), gps_capture (device GPS at capture), manual (pasted/entered in edit form). */
export type CoordinateSource = 'exif' | 'gps_capture' | 'manual' | null

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
  coordinateSource?: CoordinateSource
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
  coordinateSource?: CoordinateSource
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
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  coordinateSource?: CoordinateSource
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
