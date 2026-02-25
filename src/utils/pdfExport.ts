import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import type { Trail, POIRecord, BrochureSetup } from '../types'
import { fetchStaticMapForPdf } from './mapbox'

export const INTRO_WORD_LIMIT = 75

/** Exported for testing. Returns up to INTRO_WORD_LIMIT words from text. */
export function getIntroWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, INTRO_WORD_LIMIT)
}

/**
 * Compute POI page layout coordinates. Image is always at top; title and text
 * are positioned relative to the image bottom. Exported for testing.
 */
export function computePoiPageLayout(
  imgWidth: number,
  imgHeight: number,
  _rotation: 0 | 90 | 180 | 270,
  pageWidth: number,
  pageHeight: number
): { imageBottomY: number; titleY: number } {
  const photoHeight = pageHeight * 0.4
  const photoScale = Math.min(
    pageWidth / imgWidth,
    photoHeight / imgHeight
  )
  const photoH = Math.min(imgHeight * photoScale, photoHeight)
  const imageBottomY = pageHeight - photoH
  const titleY = imageBottomY - 25
  return { imageBottomY, titleY }
}

/**
 * Apply EXIF orientation (and optional user rotation) to an image before embedding in PDF.
 * pdf-lib does not respect EXIF; this ensures correct orientation.
 * Uses createImageBitmap (browser applies EXIF when decoding) + canvas for rotation.
 * Falls back to Image when createImageBitmap is unavailable.
 * Uses sharp only in Node (tests) where canvas/Image may not decode JPEGs.
 */
export async function fixImageOrientationForPdf(
  blob: Blob,
  userRotation?: 0 | 90 | 180 | 270
): Promise<Blob> {
  const needsRotation = userRotation === 90 || userRotation === 180 || userRotation === 270
  const needsExifFix = await hasExifOrientation(blob)

  if (!needsRotation && !needsExifFix) {
    return blob
  }

  // Node (vitest): jsdom's Image/createImageBitmap don't decode JPEGs; use sharp for tests
  const isNode = typeof process !== 'undefined' && process.versions?.node
  if (isNode) {
    try {
      const sharp = (await import('sharp')).default
      const buf = Buffer.from(await blob.arrayBuffer())
      let pipeline = sharp(buf, { autoOrient: true })
      if (needsRotation && userRotation) {
        pipeline = pipeline.rotate(userRotation)
      }
      const out = await pipeline.jpeg({ quality: 92 }).toBuffer()
      return new Blob([new Uint8Array(out)], { type: 'image/jpeg' })
    } catch {
      // Fall through to canvas path
    }
  }

  // Browser: createImageBitmap/Image apply EXIF when decoding; then apply userRotation via canvas
  return drawOrientedImageToCanvas(blob, userRotation ?? 0)
}

/**
 * Decode image (EXIF applied by browser) and draw to canvas with userRotation.
 * Uses createImageBitmap when available, else Image.
 */
async function drawOrientedImageToCanvas(
  blob: Blob,
  userRotation: 0 | 90 | 180 | 270
): Promise<Blob> {
  let width: number
  let height: number
  let drawable: ImageBitmap | HTMLImageElement

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    width = bitmap.width
    height = bitmap.height
    drawable = bitmap
  } else {
    const img = await loadImage(blob)
    width = img.width
    height = img.height
    drawable = img
  }

  const canvas = document.createElement('canvas')
  if (userRotation === 90 || userRotation === 270) {
    canvas.width = height
    canvas.height = width
  } else {
    canvas.width = width
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas context')

  if (userRotation !== 0) {
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((userRotation * Math.PI) / 180)
    ctx.translate(-width / 2, -height / 2)
  }
  ctx.drawImage(drawable, 0, 0)

  if ('close' in drawable && typeof drawable.close === 'function') {
    ;(drawable as ImageBitmap).close()
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.92
    )
  })
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

async function hasExifOrientation(blob: Blob): Promise<boolean> {
  if (!blob.type.startsWith('image/jpeg')) return false
  try {
    const piexif = (await import('piexifjs')).default
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const binary = String.fromCharCode.apply(null, bytes as unknown as number[])
    if (!binary.startsWith('\xff\xd8')) return false
    const exif = piexif.load(binary) as { '0th'?: { [k: number]: number } }
    const orientation = exif['0th']?.[274]
    return typeof orientation === 'number' && orientation !== 1
  } catch {
    return false
  }
}

const A6_WIDTH = 297.64
const A6_HEIGHT = 419.53
const MAP_PAGE_WIDTH = 841
const MAP_PAGE_HEIGHT = 595
// Brand teal #3AAFA9 for brochure cover (WCAG contrast with white: use bold for normal-sized text)
const TEAL = rgb(58 / 255, 175 / 255, 169 / 255)
const NEAR_BLACK = rgb(11 / 255, 12 / 255, 12 / 255)
const WHITE = rgb(1, 1, 1)

/** WCAG AA: 4.5:1 for normal text. */
const WCAG_AA_NORMAL = 4.5

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(l1: number, l2: number): number {
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (light + 0.05) / (dark + 0.05)
}

/** Draw text with subtle letter-spacing for legibility (pdf-lib has no built-in support). */
function drawTextWithLetterSpacing(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  letterSpacing = 0.8,
  align: 'left' | 'center' = 'center'
): void {
  const totalWidth = [...text].reduce(
    (sum, c) => sum + font.widthOfTextAtSize(c, size) + letterSpacing,
    0
  ) - letterSpacing
  const startX = align === 'center' ? x - totalWidth / 2 : x
  let cx = startX
  for (const char of text) {
    page.drawText(char, { x: cx, y, size, font, color })
    cx += font.widthOfTextAtSize(char, size) + letterSpacing
  }
}

const PLACEHOLDER_URL = 'https://thememorytrail.ie'

function drawMapFallback(
  mapPage: PDFPage,
  mapHeaderH: number,
  helvetica: PDFFont,
  pageWidth: number,
  pageHeight: number
): void {
  const fallbackMsg = 'Map requires POIs with GPS coordinates. Record location when capturing photos to generate a map.'
  const fallbackY = pageHeight - mapHeaderH - 80
  const words = fallbackMsg.split(/\s+/)
  let fallbackLine = ''
  let fy = fallbackY
  for (const word of words) {
    const test = fallbackLine ? `${fallbackLine} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 10) > pageWidth - 40) {
      if (fallbackLine && fy > 80) {
        const lw = helvetica.widthOfTextAtSize(fallbackLine, 10)
        mapPage.drawText(fallbackLine, {
          x: (pageWidth - lw) / 2,
          y: fy,
          size: 10,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        })
        fy -= 14
      }
      fallbackLine = word
    } else {
      fallbackLine = test
    }
  }
  if (fallbackLine && fy > 80) {
    const lw = helvetica.widthOfTextAtSize(fallbackLine, 10)
    mapPage.drawText(fallbackLine, {
      x: (pageWidth - lw) / 2,
      y: fy,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
  }
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

function isPng(blob: Blob): boolean {
  return blob.type === 'image/png'
}

function wrapText(
  font: PDFFont,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (line) lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Select the best image blob for PDF generation: full-resolution photoBlob
 * when available, otherwise thumbnailBlob. Exported for testing.
 */
export function getImageBlobForPdf(poi: POIRecord): {
  blob: Blob
  usedFallback: boolean
} {
  if (poi.photoBlob != null && poi.photoBlob.size > 0) {
    return { blob: poi.photoBlob, usedFallback: false }
  }
  if (poi.thumbnailBlob != null && poi.thumbnailBlob.size > 0) {
    console.warn(
      `[pdfExport] POI ${poi.id} (${poi.siteName || poi.filename}) has no photoBlob; using thumbnail for PDF`
    )
    return { blob: poi.thumbnailBlob, usedFallback: true }
  }
  throw new Error(
    `POI ${poi.id} has neither photoBlob nor thumbnailBlob for PDF generation`
  )
}

async function embedImage(
  doc: PDFDocument,
  blob: Blob
): Promise<PDFImage> {
  const bytes = await blobToUint8Array(blob)
  return isPng(blob) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
}

export async function generateBrochurePdf(
  _trail: Trail,
  setup: BrochureSetup,
  pois: POIRecord[]
): Promise<Blob> {
  const doc = await PDFDocument.create()
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const validatedPois = pois
    .filter((p) => p.completed)
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 8)

  const page1 = doc.addPage([A6_WIDTH, A6_HEIGHT])

  // Layout constants: header band (solid teal), image zone, footer band (solid teal)
  const FOOTER_HEIGHT = 30
  const SUPER_TITLE_SIZE = 14
  const TITLE_SIZE = setup.coverPhotoBlob ? 20 : 24
  const SUBTITLE_SIZE = 11
  const HEADER_PADDING = 20
  // Header height: supertitle + title (1–2 lines) + subtitle + padding
  const HEADER_HEIGHT = setup.coverPhotoBlob ? 110 : 0

  // Contrast audit: white on teal #3AAFA9 (rgb 58,175,169)
  const tealLum = relativeLuminance(58 / 255, 175 / 255, 169 / 255)
  const whiteLum = relativeLuminance(1, 1, 1)
  const whiteOnTealRatio = contrastRatio(whiteLum, tealLum)
  // Subtitle at 11pt: use bold to meet WCAG AA large-text (3:1) if ratio < 4.5:1
  const subtitleFont = whiteOnTealRatio >= WCAG_AA_NORMAL ? helvetica : helveticaBold

  if (setup.coverPhotoBlob) {
    // Photo cover: solid header band, image zone below, solid footer band
    const imageZoneTop = A6_HEIGHT - HEADER_HEIGHT
    const imageZoneBottom = FOOTER_HEIGHT
    const imageZoneHeight = imageZoneTop - imageZoneBottom

    const coverImage = await embedImage(doc, setup.coverPhotoBlob)
    const imgScale = Math.max(
      A6_WIDTH / coverImage.width,
      imageZoneHeight / coverImage.height
    )
    const imgW = coverImage.width * imgScale
    const imgH = coverImage.height * imgScale
    const imgX = (A6_WIDTH - imgW) / 2
    const imgY = imageZoneBottom + (imageZoneHeight - imgH) / 2

    page1.drawImage(coverImage, {
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    })

    // Solid teal header band (fully opaque, no photo bleed-through)
    page1.drawRectangle({
      x: 0,
      y: imageZoneTop,
      width: A6_WIDTH,
      height: HEADER_HEIGHT,
      color: TEAL,
    })

    // Supertitle "Historic Graves Trail": 14pt, white, letter-spacing
    const supertitleY = A6_HEIGHT - HEADER_PADDING - SUPER_TITLE_SIZE
    drawTextWithLetterSpacing(
      page1,
      'Historic Graves Trail',
      20,
      supertitleY,
      SUPER_TITLE_SIZE,
      helvetica,
      WHITE,
      0.8,
      'left'
    )
  } else {
    // Text-only cover: full solid teal background
    page1.drawRectangle({
      x: 0,
      y: 0,
      width: A6_WIDTH,
      height: A6_HEIGHT,
      color: TEAL,
    })

    // Historic Graves Trail branding for text-only covers
    drawTextWithLetterSpacing(
      page1,
      'Historic Graves Trail',
      A6_WIDTH / 2,
      45,
      SUPER_TITLE_SIZE,
      helvetica,
      WHITE,
      0.8,
      'center'
    )
  }

  // Main title: bold, large, entirely within solid teal band (photo) or centered (text-only)
  const titleText = setup.coverTitle.toUpperCase()
  const maxWidth = A6_WIDTH - 40
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, TITLE_SIZE)
  let titleBottomY: number

  if (setup.coverPhotoBlob) {
    const titleAreaCenterY = A6_HEIGHT - HEADER_HEIGHT / 2
    if (titleWidth <= maxWidth) {
      page1.drawText(titleText, {
        x: (A6_WIDTH - titleWidth) / 2,
        y: titleAreaCenterY - TITLE_SIZE / 2,
        size: TITLE_SIZE,
        font: helveticaBold,
        color: WHITE,
      })
      titleBottomY = titleAreaCenterY - TITLE_SIZE / 2
    } else {
      const words = titleText.split(' ')
      const lines: string[] = []
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (helveticaBold.widthOfTextAtSize(testLine, TITLE_SIZE) <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      }
      if (currentLine) lines.push(currentLine)
      const lineHeight = TITLE_SIZE * 1.2
      const totalHeight = lines.length * lineHeight
      const startY = titleAreaCenterY + totalHeight / 2 - lineHeight
      lines.forEach((line, i) => {
        const lw = helveticaBold.widthOfTextAtSize(line, TITLE_SIZE)
        page1.drawText(line, {
          x: (A6_WIDTH - lw) / 2,
          y: startY - i * lineHeight,
          size: TITLE_SIZE,
          font: helveticaBold,
          color: WHITE,
        })
      })
      titleBottomY = startY - (lines.length - 1) * lineHeight
    }
  } else {
    const titleY = A6_HEIGHT / 2
    if (titleWidth <= maxWidth) {
      page1.drawText(titleText, {
        x: (A6_WIDTH - titleWidth) / 2,
        y: titleY - TITLE_SIZE / 2,
        size: TITLE_SIZE,
        font: helveticaBold,
        color: WHITE,
      })
      titleBottomY = titleY - TITLE_SIZE / 2
    } else {
      const words = titleText.split(' ')
      const lines: string[] = []
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (helveticaBold.widthOfTextAtSize(testLine, TITLE_SIZE) <= maxWidth) {
          currentLine = testLine
        } else {
          if (currentLine) lines.push(currentLine)
          currentLine = word
        }
      }
      if (currentLine) lines.push(currentLine)
      const lineHeight = TITLE_SIZE * 1.2
      const totalHeight = lines.length * lineHeight
      const startY = titleY + totalHeight / 2 - lineHeight
      lines.forEach((line, i) => {
        const lw = helveticaBold.widthOfTextAtSize(line, TITLE_SIZE)
        page1.drawText(line, {
          x: (A6_WIDTH - lw) / 2,
          y: startY - i * lineHeight,
          size: TITLE_SIZE,
          font: helveticaBold,
          color: WHITE,
        })
      })
      titleBottomY = startY - (lines.length - 1) * lineHeight
    }
  }

  // Subtitle: WCAG AA contrast — use bold if ratio < 4.5:1
  const subtitleText = 'National Historic Graveyard Trail 2026'
  const subtitleWidth = subtitleFont.widthOfTextAtSize(subtitleText, SUBTITLE_SIZE)
  page1.drawText(subtitleText, {
    x: (A6_WIDTH - subtitleWidth) / 2,
    y: titleBottomY - 20,
    size: SUBTITLE_SIZE,
    font: subtitleFont,
    color: WHITE,
  })

  // Solid teal footer band (fully opaque), bold white text
  page1.drawRectangle({
    x: 0,
    y: 0,
    width: A6_WIDTH,
    height: FOOTER_HEIGHT,
    color: TEAL,
  })
  const groupWidth = helveticaBold.widthOfTextAtSize(
    setup.groupName.toUpperCase(),
    12
  )
  page1.drawText(setup.groupName.toUpperCase(), {
    x: (A6_WIDTH - groupWidth) / 2,
    y: 8,
    size: 12,
    font: helveticaBold,
    color: WHITE,
  })

  const page2 = doc.addPage([A6_WIDTH, A6_HEIGHT])

  const introHeaderHeight = 30
  page2.drawRectangle({
    x: 0,
    y: A6_HEIGHT - introHeaderHeight,
    width: A6_WIDTH,
    height: introHeaderHeight,
    color: TEAL,
  })
  page2.drawText('INTRODUCTION', {
    x: 20,
    y: A6_HEIGHT - introHeaderHeight + 8,
    size: 12,
    font: helveticaBold,
    color: WHITE,
  })

  const introWords = getIntroWords(setup.introText)
  let introY = A6_HEIGHT - introHeaderHeight - 20
  let line = ''
  const textMaxWidth = A6_WIDTH - 40
  for (const word of introWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 10) > textMaxWidth) {
      if (line && introY > 100) {
        page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
        introY -= 12
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && introY > 100) {
    page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
    introY -= 12
  }

  const sectionPadding = 12
  let y = introY - sectionPadding

  // Divider
  page2.drawLine({ start: { x: 20, y }, end: { x: A6_WIDTH - 20, y } })
  y -= sectionPadding

  // FUNDED AND SUPPORTED BY
  const fundedHeader = 'FUNDED AND SUPPORTED BY'
  page2.drawText(fundedHeader, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(fundedHeader, 10) / 2,
    y,
    size: 10,
    font: helveticaBold,
    color: NEAR_BLACK,
  })
  y -= 10

  const funderLines = setup.funderText.trim()
    ? wrapText(helvetica, setup.funderText.trim(), textMaxWidth, 9)
    : []
  for (const ln of funderLines) {
    if (y > 100) {
      const lw = helvetica.widthOfTextAtSize(ln, 9)
      page2.drawText(ln, { x: (A6_WIDTH - lw) / 2, y, size: 9, font: helvetica, color: NEAR_BLACK })
      y -= 10
    }
  }
  y -= sectionPadding

  // Divider
  page2.drawLine({ start: { x: 20, y }, end: { x: A6_WIDTH - 20, y } })
  y -= sectionPadding

  // CREDITS & ACKNOWLEDGEMENTS
  const creditsHeader = 'CREDITS & ACKNOWLEDGEMENTS'
  page2.drawText(creditsHeader, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(creditsHeader, 10) / 2,
    y,
    size: 10,
    font: helveticaBold,
    color: NEAR_BLACK,
  })
  y -= 10

  const creditsWords = setup.creditsText.trim().split(/\s+/).filter(Boolean).slice(0, 40)
  line = ''
  for (const word of creditsWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 9) > textMaxWidth) {
      if (line && y > 70) {
        const lw = helvetica.widthOfTextAtSize(line, 9)
        page2.drawText(line, { x: (A6_WIDTH - lw) / 2, y, size: 9, font: helvetica, color: NEAR_BLACK })
        y -= 10
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && y > 70) {
    const lw = helvetica.widthOfTextAtSize(line, 9)
    page2.drawText(line, { x: (A6_WIDTH - lw) / 2, y, size: 9, font: helvetica, color: NEAR_BLACK })
    y -= 10
  }
  y -= sectionPadding

  page2.drawText(setup.groupName, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(setup.groupName, 10) / 2,
    y,
    size: 10,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  page2.drawText('Content licensed under CC BY-NC-ND', {
    x: A6_WIDTH / 2 - helvetica.widthOfTextAtSize('Content licensed under CC BY-NC-ND', 8) / 2,
    y: 20,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  for (let i = 0; i < validatedPois.length; i++) {
    const poi = validatedPois[i]
    const poiPage = doc.addPage([A6_WIDTH, A6_HEIGHT])

    const { blob: imageBlob } = getImageBlobForPdf(poi)
    const rotation = (poi.rotation ?? 0) as 0 | 90 | 180 | 270
    const orientedBlob = await fixImageOrientationForPdf(imageBlob, rotation)
    const photoBytes = await blobToUint8Array(orientedBlob)
    const photoImg = isPng(orientedBlob)
      ? await doc.embedPng(photoBytes)
      : await doc.embedJpg(photoBytes)

    const photoHeight = A6_HEIGHT * 0.4
    const photoScale = Math.min(
      A6_WIDTH / photoImg.width,
      photoHeight / photoImg.height
    )
    const photoW = Math.min(photoImg.width * photoScale, A6_WIDTH)
    const photoH = Math.min(photoImg.height * photoScale, photoHeight)
    const photoX = (A6_WIDTH - photoW) / 2
    const photoY = A6_HEIGHT - photoH

    poiPage.drawImage(photoImg, {
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
    })

    const titleY = photoY - 25
    const headerText = `${poi.sequence}. ${(poi.siteName || poi.filename).toUpperCase()}`
    const titleSize = headerText.length > 40 ? 12 : 14
    poiPage.drawText(headerText.substring(0, 60), {
      x: 20,
      y: titleY,
      size: titleSize,
      font: helveticaBold,
      color: NEAR_BLACK,
    })

    // Thin divider line below title
    const dividerY = titleY - 10
    poiPage.drawRectangle({
      x: 20,
      y: dividerY,
      width: A6_WIDTH - 40,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })

    // Story text section (digital-only: maximum space for text)
    const storyStartY = dividerY - 20
    const storyEndY = 50 // Digital PDF: no QR code needed, leave minimal space for URL
    const bodyText = poi.story || ''
    const maxLen = 1200 // Digital format allows more text
    const bodyChunk = bodyText.length > maxLen
      ? bodyText.substring(0, maxLen) + '...'
      : bodyText
    const bodyWords = bodyChunk.split(/\s+/)
    let bodyLine = ''
    let by = storyStartY
    for (const word of bodyWords) {
      const test = bodyLine ? `${bodyLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 13) > A6_WIDTH - 40) {
        if (bodyLine && by > storyEndY) {
          poiPage.drawText(bodyLine, { x: 20, y: by, size: 13, font: helvetica, color: NEAR_BLACK })
          by -= 16
        }
        bodyLine = word
      } else {
        bodyLine = test
      }
    }
    if (bodyLine && by > storyEndY) {
      poiPage.drawText(bodyLine, { x: 20, y: by, size: 13, font: helvetica, color: NEAR_BLACK })
      by -= 16
    }

    // Thin divider line above URL section
    const divider2Y = 58
    poiPage.drawRectangle({
      x: 20,
      y: divider2Y,
      width: A6_WIDTH - 40,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })

    // Simple URL display at bottom (digital PDF - no QR code needed)
    const urlDisplay = poi.url?.trim() || PLACEHOLDER_URL
    const urlText = urlDisplay.length > 35 ? urlDisplay.substring(0, 32) + '...' : urlDisplay
    const urlTextWidth = helvetica.widthOfTextAtSize(urlText, 9)
    
    poiPage.drawText(urlText, {
      x: (A6_WIDTH - urlTextWidth) / 2,
      y: 30,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.6), // Blue link color
    })
    
    // "Tap to visit" label above URL
    const tapLabel = 'Tap to visit:'
    const tapLabelWidth = helvetica.widthOfTextAtSize(tapLabel, 8)
    poiPage.drawText(tapLabel, {
      x: (A6_WIDTH - tapLabelWidth) / 2,
      y: 42,
      size: 8,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  const mapPage = doc.addPage([MAP_PAGE_WIDTH, MAP_PAGE_HEIGHT])
  const mapHeaderH = 35
  mapPage.drawRectangle({
    x: 0,
    y: MAP_PAGE_HEIGHT - mapHeaderH,
    width: MAP_PAGE_WIDTH,
    height: mapHeaderH,
    color: TEAL,
  })
  mapPage.drawText('MAP', {
    x: 20,
    y: MAP_PAGE_HEIGHT - mapHeaderH + 10,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  })

  const mapMargin = 12
  const mapAreaWidth = MAP_PAGE_WIDTH - mapMargin * 2
  const mapAreaHeight = MAP_PAGE_HEIGHT - mapHeaderH - mapMargin * 2

  const mapBlob = await fetchStaticMapForPdf(pois, {
    width: 1200,
    height: 700,
  })
  if (mapBlob) {
    try {
      const mapImg = await embedImage(doc, mapBlob)
      const mapScale = Math.min(
        mapAreaWidth / mapImg.width,
        mapAreaHeight / mapImg.height
      )
      const mapW = mapImg.width * mapScale
      const mapH = mapImg.height * mapScale
      const mapX = (MAP_PAGE_WIDTH - mapW) / 2
      const mapY = MAP_PAGE_HEIGHT - mapHeaderH - mapMargin - mapH

      mapPage.drawImage(mapImg, {
        x: mapX,
        y: mapY,
        width: mapW,
        height: mapH,
      })
    } catch (err) {
      console.error('Failed to embed map image:', err)
      drawMapFallback(mapPage, mapHeaderH, helvetica, MAP_PAGE_WIDTH, MAP_PAGE_HEIGHT)
    }
  } else {
    drawMapFallback(mapPage, mapHeaderH, helvetica, MAP_PAGE_WIDTH, MAP_PAGE_HEIGHT)
  }

  const pdfBytes = await doc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
