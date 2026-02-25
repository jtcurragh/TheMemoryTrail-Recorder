import JSZip from 'jszip'
import type { Trail, POIRecord, UserProfile } from '../types'
import { getPOIsByTrailId } from '../db/pois'
import { deriveGroupCode } from './groupCode'

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function poiToCsvRow(poi: POIRecord): string {
  const row = [
    poi.filename,
    poi.siteName,
    poi.category,
    poi.description,
    poi.story,
    poi.url,
    poi.condition,
    poi.notes,
    String(poi.latitude ?? ''),
    String(poi.longitude ?? ''),
    String(poi.accuracy ?? ''),
    poi.capturedAt,
    String(poi.sequence),
    poi.trailType,
    poi.groupCode,
    poi.createdBy ?? '',
    poi.lastModifiedBy ?? '',
    poi.lastModifiedAt ?? '',
  ]
  return row.map((v) => escapeCsvValue(String(v))).join(',')
}

function csvHeader(): string {
  return [
    'filename',
    'siteName',
    'category',
    'description',
    'story',
    'url',
    'condition',
    'notes',
    'latitude',
    'longitude',
    'accuracy',
    'capturedAt',
    'sequence',
    'trailType',
    'groupCode',
    'createdBy',
    'lastModifiedBy',
    'lastModifiedAt',
  ].join(',')
}

function buildStoriesTemplate(pois: POIRecord[], trailLabel: string): string {
  const lines = [
    `${trailLabel.toUpperCase()} — Add your 100–200 word story under each POI`,
    'Open in Word, fill in the brackets, save as .txt, and email to your coordinator.',
    '',
    '—'.repeat(50),
    '',
  ]

  for (const poi of pois.sort((a, b) => a.sequence - b.sequence)) {
    lines.push(`${poi.sequence}. ${poi.filename}`)
    lines.push('[Type your 100–200 word story here]')
    lines.push('')
    lines.push('')
  }

  return lines.join('\n')
}

function buildKml(pois: POIRecord[], trailLabel: string): string {
  const placemarks = pois
    .filter((p) => p.latitude != null && p.longitude != null)
    .sort((a, b) => a.sequence - b.sequence)
    .map(
      (p) => `
  <Placemark>
    <name>${p.sequence}. ${p.filename}</name>
    <description>${escapeXml(p.siteName || p.filename)}</description>
    <Point>
      <coordinates>${p.longitude},${p.latitude},0</coordinates>
    </Point>
  </Placemark>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(trailLabel)}</name>${placemarks}
  </Document>
</kml>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function exportTrailsToZip(trails: Trail[]): Promise<Blob> {
  const zip = new JSZip()
  const groupCode = trails[0]?.groupCode ?? 'export'

  for (const trail of trails) {
    const pois = await getPOIsByTrailId(trail.id, { includeBlobs: true })
    if (pois.length === 0) continue

    const sortedPois = [...pois].sort((a, b) => a.sequence - b.sequence)
    const trailLabel = trail.displayName
    const suffix = trail.trailType === 'graveyard' ? 'graveyard' : 'parish'
    const prefix = `${suffix}/`

    const trailManifest = {
      schemaVersion: '1.0',
      trailId: trail.id,
      groupCode: trail.groupCode,
      trailType: trail.trailType,
      displayName: trail.displayName,
      createdAt: trail.createdAt,
      nextSequence: trail.nextSequence,
      lastModifiedAt: new Date().toISOString(),
      poiCount: sortedPois.length,
    }
    zip.file(`${prefix}trail_${suffix}.json`, JSON.stringify(trailManifest, null, 2))

    for (const poi of sortedPois) {
      zip.file(`${prefix}${poi.filename}`, poi.photoBlob)
    }

    const csvRows = [csvHeader(), ...sortedPois.map(poiToCsvRow)]
    zip.file(`${prefix}${groupCode}_${suffix}.csv`, csvRows.join('\n'))

    const storiesTemplate = buildStoriesTemplate(sortedPois, trailLabel)
    zip.file(`${prefix}${groupCode}_${suffix}_stories.txt`, storiesTemplate)

    const hasAnyGps = sortedPois.some(
      (p) => p.latitude != null && p.longitude != null
    )
    if (hasAnyGps) {
      const kml = buildKml(sortedPois, trailLabel)
      zip.file(`${prefix}${groupCode}_${suffix}.kml`, kml)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Derives the ZIP export filename from the graveyard trail's displayName.
 * Strips " Graveyard Trail" suffix and sanitises via deriveGroupCode.
 */
export function getExportZipFilename(
  profile: UserProfile,
  trails: Trail[]
): string {
  const graveyard = trails.find((t) => t.trailType === 'graveyard')
  const baseName = graveyard?.displayName?.replace(/\s+Graveyard Trail$/i, '') ?? ''
  const placeSlug = baseName ? deriveGroupCode(baseName) : ''
  const slug = placeSlug || profile.groupCode
  return `${slug}_historic_graves_trail_export.zip`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
