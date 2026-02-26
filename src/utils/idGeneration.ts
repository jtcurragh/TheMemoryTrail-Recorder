/**
 * Generates POI ID in format [location]-[trailtype]-[DDMMYY]-[HHmmss]-[SSS]
 * e.g. ardmore-g-260226-142347-123
 * g = graveyard, p = parish
 * SSS = milliseconds for uniqueness when multiple POIs created in same second.
 * Uses current datetime at moment of call — call once per POI creation.
 */
export function generatePOIId(
  groupCode: string,
  trailType: 'graveyard' | 'parish'
): string {
  const suffix = trailType === 'graveyard' ? 'g' : 'p'
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${groupCode}-${suffix}-${dd}${mm}${yy}-${hh}${min}${ss}-${ms}`
}

/**
 * Returns filename for POI: [id].jpg
 */
export function generateFilename(poiId: string): string {
  return `${poiId}.jpg`
}
