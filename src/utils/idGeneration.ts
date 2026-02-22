/**
 * Generates POI ID in format [groupcode]-[g|p]-[sequence]
 * g = graveyard, p = parish
 */
export function generatePOIId(
  groupCode: string,
  trailType: 'graveyard' | 'parish',
  sequence: number
): string {
  const suffix = trailType === 'graveyard' ? 'g' : 'p'
  const padded = String(sequence).padStart(3, '0')
  return `${groupCode}-${suffix}-${padded}`
}

/**
 * Returns filename for POI: [id].jpg
 */
export function generateFilename(poiId: string): string {
  return `${poiId}.jpg`
}
