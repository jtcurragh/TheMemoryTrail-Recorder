function getThumbnailSettings(): { maxSize: number; quality: number } {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isIOS ? { maxSize: 120, quality: 0.6 } : { maxSize: 200, quality: 0.8 }
}

/**
 * Generate a smaller preview Blob from a full JPEG Blob.
 * Uses createImageBitmap + OffscreenCanvas (like GraveSnap) when available —
 * more memory-efficient on iOS than Image + blob URL.
 */
export async function generateThumbnail(jpegBlob: Blob): Promise<Blob> {
  const { maxSize, quality } = getThumbnailSettings()

  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
    try {
      // GraveSnap-style path: createImageBitmap + OffscreenCanvas + bitmap.close()
      const bitmap = await createImageBitmap(jpegBlob)
      const { width, height } = bitmap
      const scale = Math.min(1, maxSize / Math.max(width, height))
      const w = Math.round(width * scale)
      const h = Math.round(height * scale)
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      return canvas.convertToBlob({ type: 'image/jpeg', quality })
    } catch {
      // Fall through to Image path
    }
  }

  // Fallback: Image + blob URL (original path)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(jpegBlob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale = Math.min(1, maxSize / Math.max(width, height))
      const w = Math.round(width * scale)
      const h = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => resolve(blob ?? jpegBlob),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

/**
 * Process an image to fix EXIF orientation issues.
 * Uses createImageBitmap which automatically handles EXIF orientation.
 * Returns a properly oriented JPEG blob at full resolution.
 */
export async function fixOrientation(imageBlob: Blob): Promise<Blob> {
  if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(imageBlob)
      const { width, height } = bitmap
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: Image + blob URL
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageBlob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ?? imageBlob),
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
