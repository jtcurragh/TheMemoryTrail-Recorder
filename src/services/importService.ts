import JSZip from 'jszip'
import type { Trail, POIRecord, TrailType, POICategory, POICondition } from '../types'
import { db } from '../db/database'
import { getTrailById } from '../db/trails'
import { generatePOIId, generateFilename } from '../utils/idGeneration'

export interface TrailManifest {
  schemaVersion: string
  trailId: string
  groupCode: string
  trailType: TrailType
  displayName: string
  createdAt: string
  nextSequence: number
  lastModifiedAt: string
  poiCount: number
}

export interface ConflictDetails {
  existingLastModified: string
  incomingLastModified: string
}

export interface ImportResult {
  status: 'success' | 'conflict' | 'error'
  trailId: string
  trailName: string
  poisImported: number
  poisSkipped: number
  imagesFailed: number
  conflictDetails?: ConflictDetails
  errorMessage?: string
}

interface POIData {
  filename: string
  siteName: string
  category: POICategory
  description: string
  story: string
  url: string
  condition: POICondition
  notes: string
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  capturedAt: string
  sequence: number
  trailType: TrailType
  groupCode: string
  createdBy?: string
  lastModifiedBy?: string
  lastModifiedAt?: string
  photoBlob?: Blob
  thumbnailBlob?: Blob
  warnings: string[]
}

function parseCsvValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"')
  }
  return value
}

function parseCsvRow(row: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)

  return values
}

function splitCsvLines(content: string): string[] {
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '""'
        i++
      } else {
        inQuotes = !inQuotes
      }
      currentLine += char === '"' && !(inQuotes && nextChar === '"') ? '"' : ''
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
      i++
    } else {
      currentLine += char
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  return lines
}

async function extractTrailManifest(zip: JSZip): Promise<TrailManifest> {
  const graveyardManifest = zip.file('trail_graveyard.json')
  const parishManifest = zip.file('trail_parish.json')

  const manifestFile = graveyardManifest || parishManifest
  if (!manifestFile) {
    throw new Error('No trail manifest found in ZIP. This file may be from an older export version.')
  }

  const content = await manifestFile.async('text')
  const manifest = JSON.parse(content) as TrailManifest

  return manifest
}

function validateSchemaVersion(manifest: TrailManifest): void {
  if (!manifest.schemaVersion) {
    throw new Error('Schema version missing from trail manifest. Cannot import this file.')
  }

  if (manifest.schemaVersion !== '1.0') {
    throw new Error(`Unsupported schema version: ${manifest.schemaVersion}. This app supports version 1.0 only.`)
  }
}

async function extractPOIsFromCSV(
  zip: JSZip,
  groupCode: string,
  trailType: TrailType
): Promise<POIData[]> {
  const suffix = trailType === 'graveyard' ? 'graveyard' : 'parish'
  const csvFile = zip.file(`${groupCode}_${suffix}.csv`)

  if (!csvFile) {
    throw new Error(`CSV file not found: ${groupCode}_${suffix}.csv`)
  }

  const content = await csvFile.async('text')
  const lines = splitCsvLines(content)

  if (lines.length < 2) {
    throw new Error('CSV file is empty or contains only headers')
  }

  const headerLine = lines[0]
  const headers = parseCsvRow(headerLine)

  const pois: POIData[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i])
    const warnings: string[] = []

    const getValue = (fieldName: string): string => {
      const index = headers.indexOf(fieldName)
      return index >= 0 ? parseCsvValue(values[index] || '') : ''
    }

    const filename = getValue('filename')
    const siteName = getValue('siteName')
    const latStr = getValue('latitude')
    const lonStr = getValue('longitude')

    if (!filename) {
      warnings.push('Missing filename - POI skipped')
      continue
    }

    const latitude = latStr ? parseFloat(latStr) : null
    const longitude = lonStr ? parseFloat(lonStr) : null

    if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
      warnings.push('Missing or invalid GPS coordinates')
    }

    const sequenceStr = getValue('sequence')
    const sequence = sequenceStr ? parseInt(sequenceStr, 10) : i

    pois.push({
      filename,
      siteName,
      category: (getValue('category') as POICategory) || 'Other',
      description: getValue('description'),
      story: getValue('story'),
      url: getValue('url'),
      condition: (getValue('condition') as POICondition) || 'Good',
      notes: getValue('notes'),
      latitude,
      longitude,
      accuracy: getValue('accuracy') ? parseFloat(getValue('accuracy')) : null,
      capturedAt: getValue('capturedAt') || new Date().toISOString(),
      sequence,
      trailType,
      groupCode,
      createdBy: getValue('createdBy'),
      lastModifiedBy: getValue('lastModifiedBy'),
      lastModifiedAt: getValue('lastModifiedAt'),
      warnings,
    })
  }

  return pois
}

async function matchPhotosToBlobs(zip: JSZip, pois: POIData[]): Promise<void> {
  for (const poi of pois) {
    try {
      const photoFile = zip.file(poi.filename)
      if (!photoFile) {
        poi.warnings.push(`Photo file not found: ${poi.filename}`)
        continue
      }

      const photoBlob = await photoFile.async('blob')
      poi.photoBlob = photoBlob
      poi.thumbnailBlob = photoBlob

    } catch (error) {
      poi.warnings.push(`Failed to load photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

async function detectConflict(trailId: string): Promise<ConflictDetails | null> {
  const existingTrail = await getTrailById(trailId)
  if (!existingTrail) {
    return null
  }

  const pois = await db.pois.where('trailId').equals(trailId).toArray()
  const mostRecentPoi = pois.reduce<POIRecord | null>((latest, poi) => {
    if (!latest) return poi as POIRecord
    const latestTime = latest.lastModifiedAt || latest.capturedAt
    const poiTime = (poi as POIRecord).lastModifiedAt || poi.capturedAt
    return new Date(poiTime) > new Date(latestTime) ? (poi as POIRecord) : latest
  }, null)

  return {
    existingLastModified: mostRecentPoi?.lastModifiedAt || mostRecentPoi?.capturedAt || existingTrail.createdAt,
    incomingLastModified: '',
  }
}

async function importTrail(
  manifest: TrailManifest,
  pois: POIData[],
  strategy: 'overwrite' | 'skip' = 'skip'
): Promise<ImportResult> {
  const trailId = manifest.trailId
  const existingTrail = await getTrailById(trailId)

  if (existingTrail && strategy === 'skip') {
    return {
      status: 'success',
      trailId,
      trailName: manifest.displayName,
      poisImported: 0,
      poisSkipped: pois.length,
      imagesFailed: 0,
      errorMessage: 'Import cancelled - existing trail kept',
    }
  }

  if (existingTrail && strategy === 'overwrite') {
    await db.pois.where('trailId').equals(trailId).delete()
  }

  const trail: Trail = {
    id: trailId,
    groupCode: manifest.groupCode,
    trailType: manifest.trailType,
    displayName: manifest.displayName,
    createdAt: manifest.createdAt,
    nextSequence: manifest.nextSequence,
  }

  if (existingTrail) {
    await db.trails.update(trailId, trail)
  } else {
    await db.trails.add(trail)
  }

  let poisImported = 0
  let poisSkipped = 0
  let imagesFailed = 0

  for (const poiData of pois) {
    if (!poiData.photoBlob) {
      poisSkipped++
      imagesFailed++
      continue
    }

    try {
      const id = generatePOIId(poiData.groupCode, poiData.trailType)
      const filename = generateFilename(id)

      const poiRecord: POIRecord = {
        id,
        trailId,
        groupCode: poiData.groupCode,
        trailType: poiData.trailType,
        sequence: poiData.sequence,
        filename,
        photoBlob: poiData.photoBlob,
        thumbnailBlob: poiData.thumbnailBlob || poiData.photoBlob,
        latitude: poiData.latitude,
        longitude: poiData.longitude,
        accuracy: poiData.accuracy,
        capturedAt: poiData.capturedAt,
        siteName: poiData.siteName,
        category: poiData.category,
        description: poiData.description,
        story: poiData.story,
        url: poiData.url,
        condition: poiData.condition,
        notes: poiData.notes,
        completed: !!(poiData.siteName && poiData.story),
        rotation: 0,
        createdBy: poiData.createdBy,
        lastModifiedBy: poiData.lastModifiedBy,
        lastModifiedAt: poiData.lastModifiedAt,
      }

      const [photoBuf, thumbBuf] = await Promise.all([
        poiRecord.photoBlob.arrayBuffer(),
        poiRecord.thumbnailBlob.arrayBuffer(),
      ])

      const recordForDb = {
        ...poiRecord,
        photoBlob: photoBuf,
        thumbnailBlob: thumbBuf,
      }

      await db.pois.put(recordForDb as unknown as POIRecord)
      poisImported++
      await new Promise((r) => setTimeout(r, 1100))
    } catch (error) {
      console.error('Failed to import POI:', poiData.siteName || poiData.filename, error)
      poisSkipped++
    }
  }

  return {
    status: 'success',
    trailId,
    trailName: manifest.displayName,
    poisImported,
    poisSkipped,
    imagesFailed,
  }
}

export async function parseZipFile(file: File): Promise<ImportResult> {
  try {
    const zip = await JSZip.loadAsync(file)

    const manifest = await extractTrailManifest(zip)
    validateSchemaVersion(manifest)

    const conflict = await detectConflict(manifest.trailId)
    if (conflict) {
      return {
        status: 'conflict',
        trailId: manifest.trailId,
        trailName: manifest.displayName,
        poisImported: 0,
        poisSkipped: 0,
        imagesFailed: 0,
        conflictDetails: {
          existingLastModified: conflict.existingLastModified,
          incomingLastModified: manifest.lastModifiedAt,
        },
      }
    }

    const pois = await extractPOIsFromCSV(zip, manifest.groupCode, manifest.trailType)
    await matchPhotosToBlobs(zip, pois)

    const result = await importTrail(manifest, pois)
    return result

  } catch (error) {
    console.error('Import failed:', error)
    return {
      status: 'error',
      trailId: '',
      trailName: '',
      poisImported: 0,
      poisSkipped: 0,
      imagesFailed: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred during import',
    }
  }
}

export async function resolveConflictAndImport(
  file: File,
  strategy: 'overwrite' | 'keep'
): Promise<ImportResult> {
  if (strategy === 'keep') {
    return {
      status: 'success',
      trailId: '',
      trailName: '',
      poisImported: 0,
      poisSkipped: 0,
      imagesFailed: 0,
      errorMessage: 'Import cancelled - existing trail kept',
    }
  }

  try {
    const zip = await JSZip.loadAsync(file)
    const manifest = await extractTrailManifest(zip)
    validateSchemaVersion(manifest)

    const pois = await extractPOIsFromCSV(zip, manifest.groupCode, manifest.trailType)
    await matchPhotosToBlobs(zip, pois)

    const result = await importTrail(manifest, pois, 'overwrite')
    return result

  } catch (error) {
    console.error('Import failed:', error)
    return {
      status: 'error',
      trailId: '',
      trailName: '',
      poisImported: 0,
      poisSkipped: 0,
      imagesFailed: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred during import',
    }
  }
}
