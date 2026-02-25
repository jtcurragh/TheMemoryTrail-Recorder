import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  rotateRectangle,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import type { Trail, POIRecord, BrochureSetup } from '../types'
import { fixOrientation } from './thumbnail'
import { fetchStaticMapForPdf } from './mapbox'

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

  const introWords = setup.introText.trim().split(/\s+/).filter(Boolean).slice(0, 50)
  let introY = A6_HEIGHT - introHeaderHeight - 25
  let line = ''
  const textMaxWidth = A6_WIDTH - 40
  for (const word of introWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 10) > textMaxWidth) {
      if (line && introY > 200) {
        page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
        introY -= 12
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && introY > 200) {
    page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
    introY -= 12
  }

  const fundedHeaderY = introY - 25
  page2.drawText('FUNDED AND SUPPORTED BY', {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize('FUNDED AND SUPPORTED BY', 11) / 2,
    y: fundedHeaderY,
    size: 11,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  const logoCellSize = 55
  const logoPadding = 12
  const logosPerRow = 2
  const logoGridWidth = logosPerRow * (logoCellSize + logoPadding) - logoPadding
  const logoGridStartX = (A6_WIDTH - logoGridWidth) / 2

  let logoY = fundedHeaderY - 15
  for (let i = 0; i < setup.funderLogos.length; i++) {
    const col = i % logosPerRow
    const row = Math.floor(i / logosPerRow)
    const cellX = logoGridStartX + col * (logoCellSize + logoPadding)
    const cellY = logoY - row * (logoCellSize + logoPadding) - logoCellSize
    try {
      const logoBytes = await blobToUint8Array(setup.funderLogos[i])
      const logoImg = isPng(setup.funderLogos[i])
        ? await doc.embedPng(logoBytes)
        : await doc.embedJpg(logoBytes)
      const scale = Math.min(logoCellSize / logoImg.width, logoCellSize / logoImg.height)
      const imgW = logoImg.width * scale
      const imgH = logoImg.height * scale
      const centerX = cellX + (logoCellSize - imgW) / 2
      const centerY = cellY + (logoCellSize - imgH) / 2
      page2.drawImage(logoImg, {
        x: centerX,
        y: centerY,
        width: imgW,
        height: imgH,
      })
    } catch {
      /* Skip logo if embedding fails (e.g. invalid image) */
    }
  }
  logoY -= setup.funderLogos.length > 0 ? Math.ceil(setup.funderLogos.length / logosPerRow) * (logoCellSize + logoPadding) : 0

  const creditsWords = setup.creditsText.trim().split(/\s+/).filter(Boolean).slice(0, 40)
  let creditsY = logoY - 20
  line = ''
  for (const word of creditsWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 9) > textMaxWidth) {
      if (line && creditsY > 70) {
        const lw = helvetica.widthOfTextAtSize(line, 9)
        page2.drawText(line, {
          x: (A6_WIDTH - lw) / 2,
          y: creditsY,
          size: 9,
          font: helvetica,
          color: NEAR_BLACK,
        })
        creditsY -= 11
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && creditsY > 70) {
    const lw = helvetica.widthOfTextAtSize(line, 9)
    page2.drawText(line, {
      x: (A6_WIDTH - lw) / 2,
      y: creditsY,
      size: 9,
      font: helvetica,
      color: NEAR_BLACK,
    })
    creditsY -= 11
  }

  page2.drawText(setup.groupName, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(setup.groupName, 10) / 2,
    y: creditsY - 15,
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
    
    // Hero photo at top (~40% of page height)
    const orientedBlob = await fixOrientation(poi.thumbnailBlob)
    console.log('[PDF] fixOrientation result:', { size: orientedBlob.size, type: orientedBlob.type })
    const photoBytes = await blobToUint8Array(orientedBlob)
    const photoImg = isPng(orientedBlob)
      ? await doc.embedPng(photoBytes)
      : await doc.embedJpg(photoBytes)
    
    const rotation = (poi.rotation ?? 0) as 0 | 90 | 180 | 270
    const effectiveW = rotation === 90 || rotation === 270 ? photoImg.height : photoImg.width
    const effectiveH = rotation === 90 || rotation === 270 ? photoImg.width : photoImg.height
    const photoHeight = A6_HEIGHT * 0.4
    const photoScale = Math.min(
      A6_WIDTH / effectiveW,
      photoHeight / effectiveH
    )
    const photoW = Math.min(effectiveW * photoScale, A6_WIDTH)
    const photoH = Math.min(effectiveH * photoScale, photoHeight)
    const photoX = (A6_WIDTH - photoW) / 2
    const photoY = A6_HEIGHT - photoH

    const rect = rotateRectangle(
      { x: photoX, y: photoY, width: photoW, height: photoH },
      0,
      rotation
    )

    poiPage.drawImage(photoImg, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      ...(rotation !== 0 && { rotate: degrees(rotation) }),
    })

    // Title section below photo
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
