import piexif from 'piexifjs'

/**
 * Convert decimal degrees to DMS rational format for EXIF GPS
 */
function degToDmsRational(degFloat: number): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(degFloat)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const secFloat = (minFloat - min) * 60
  const sec = Math.round(secFloat * 100)
  return [[deg, 1], [min, 1], [sec, 100]]
}

/**
 * Convert DMS rational format from EXIF to decimal degrees
 */
function dmsRationalToDecimal(dms: [[number, number], [number, number], [number, number]]): number {
  const deg = dms[0][0] / dms[0][1]
  const min = dms[1][0] / dms[1][1]
  const sec = dms[2][0] / dms[2][1]
  return deg + min / 60 + sec / 3600
}

/**
 * Extract GPS coordinates from a JPEG Blob's EXIF data.
 * Returns { latitude, longitude, accuracy } or null if no GPS data found.
 */
export async function extractGpsFromJpeg(
  jpegBlob: Blob
): Promise<{ latitude: number; longitude: number; accuracy: number | null } | null> {
  try {
    const arrayBuffer = await jpegBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }

    if (!binary.startsWith('\xff\xd8')) {
      return null
    }

    const exifObj = piexif.load(binary)
    if (!exifObj.GPS) {
      return null
    }

    const latRef = exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef]
    const latDms = exifObj.GPS[piexif.GPSIFD.GPSLatitude]
    const lonRef = exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef]
    const lonDms = exifObj.GPS[piexif.GPSIFD.GPSLongitude]

    if (!latDms || !lonDms || !latRef || !lonRef) {
      return null
    }

    let latitude = dmsRationalToDecimal(latDms as [[number, number], [number, number], [number, number]])
    let longitude = dmsRationalToDecimal(lonDms as [[number, number], [number, number], [number, number]])

    if (latRef === 'S') latitude = -latitude
    if (lonRef === 'W') longitude = -longitude

    return {
      latitude,
      longitude,
      accuracy: null, // EXIF doesn't typically include accuracy
    }
  } catch {
    return null
  }
}

/**
 * Embed GPS coordinates into a JPEG Blob. Returns new Blob with EXIF.
 * On failure, returns original blob unchanged (no GPS in EXIF).
 */
export async function embedGpsInJpeg(
  jpegBlob: Blob,
  latitude: number,
  longitude: number
): Promise<Blob> {
  try {
    const arrayBuffer = await jpegBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }

    if (!binary.startsWith('\xff\xd8')) {
      return jpegBlob
    }

    const exifObj = piexif.load(binary)
    if (!exifObj.GPS) {
      exifObj.GPS = {}
    }

    exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? 'N' : 'S'
    exifObj.GPS[piexif.GPSIFD.GPSLatitude] = degToDmsRational(latitude)
    exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? 'E' : 'W'
    exifObj.GPS[piexif.GPSIFD.GPSLongitude] = degToDmsRational(longitude)

    const exifBytes = piexif.dump(exifObj)
    const inserted = piexif.insert(exifBytes, binary)

    const resultBytes = new Uint8Array(inserted.length)
    for (let i = 0; i < inserted.length; i++) {
      resultBytes[i] = inserted.charCodeAt(i)
    }
    return new Blob([resultBytes], { type: 'image/jpeg' })
  } catch {
    return jpegBlob
  }
}
