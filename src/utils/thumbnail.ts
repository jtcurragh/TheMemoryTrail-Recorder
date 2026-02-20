function getThumbnailSettings(): { maxSize: number; quality: number } {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isIOS ? { maxSize: 120, quality: 0.6 } : { maxSize: 200, quality: 0.8 }
}

/**
 * Generate a smaller preview Blob from a full JPEG Blob.
 * Uses canvas to resize for grid display. More conservative on iOS for stability.
 */
export async function generateThumbnail(jpegBlob: Blob): Promise<Blob> {
  const { maxSize, quality } = getThumbnailSettings()
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
        (blob) => {
          resolve(blob ?? jpegBlob)
        },
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
