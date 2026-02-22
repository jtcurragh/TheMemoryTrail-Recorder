import type { POIRecord } from '../types'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/**
 * Generate a static map image using Mapbox Static Images API
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */
export async function generateStaticMap(pois: POIRecord[]): Promise<Blob | null> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured')
    return null
  }

  // Filter POIs with valid GPS coordinates
  const validPois = pois.filter(
    (p) => p.latitude != null && p.longitude != null
  )

  if (validPois.length === 0) {
    console.warn('No POIs with GPS coordinates')
    return null
  }

  // Calculate bounding box to fit all POIs
  const lats = validPois.map((p) => p.latitude!)
  const lons = validPois.map((p) => p.longitude!)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  // Calculate center point
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2

  // Calculate zoom level based on bounding box
  // This is approximate - Mapbox will adjust
  const latDiff = maxLat - minLat
  const lonDiff = maxLon - minLon
  const maxDiff = Math.max(latDiff, lonDiff)
  
  let zoom = 17 // default for very close POIs (increased from 16)
  if (maxDiff > 0.01) zoom = 15 // increased from 14
  if (maxDiff > 0.05) zoom = 13 // increased from 12
  if (maxDiff > 0.1) zoom = 12 // increased from 11
  if (maxDiff > 0.2) zoom = 11 // increased from 10

  // Build overlay string with numbered markers
  // Using small circle markers with sequence numbers
  const overlays = validPois
    .map((poi) => {
      // Custom marker: pin-s-{label}+{color}(lon,lat)
      const label = poi.sequence
      const color = '3a9b8e' // teal color without #
      return `pin-s-${label}+${color}(${poi.longitude},${poi.latitude})`
    })
    .join(',')

  // Build path overlay to connect POIs in sequence
  const pathCoords = validPois
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => `${p.longitude},${p.latitude}`)
    .join(',')
  
  const pathOverlay = `path-10+ff0000(${pathCoords})` // red path, 10px width, no opacity parameter

  // Construct Mapbox Static Image URL
  // Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom}/{width}x{height}{@2x}
  const width = 600
  const height = 700
  const style = 'mapbox/streets-v12' // or 'mapbox/satellite-streets-v12' for satellite
  
  const url = `https://api.mapbox.com/styles/v1/${style}/static/${pathOverlay},${overlays}/${centerLon},${centerLat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`)
    }
    return await response.blob()
  } catch (error) {
    console.error('Failed to generate static map:', error)
    return null
  }
}

/**
 * Generate demo static map with sample coordinates
 */
export async function generateDemoStaticMap(): Promise<Blob | null> {
  const demoPois: POIRecord[] = []
  for (let i = 0; i < 8; i++) {
    demoPois.push({
      id: `demo-${i}`,
      trailId: 'demo',
      groupCode: 'demo',
      trailType: 'graveyard',
      sequence: i + 1,
      filename: `demo-${i}.jpg`,
      photoBlob: new Blob(),
      thumbnailBlob: new Blob(),
      latitude: 52.0 + (i * 0.005), // Spread POIs across ~4km
      longitude: -7.0 - (i * 0.004),
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: `Demo POI ${i + 1}`,
      category: 'Historic Feature',
      description: '',
      story: '',
      url: '',
      condition: 'Good',
      notes: '',
      completed: true,
    })
  }
  return generateStaticMap(demoPois)
}
