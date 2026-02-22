import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
} from 'pdf-lib'
import type { Trail, POIRecord, BrochureSetup } from '../types'

const A6_WIDTH = 297.64
const A6_HEIGHT = 419.53
const TEAL = rgb(58 / 255, 155 / 255, 142 / 255)
const NEAR_BLACK = rgb(11 / 255, 12 / 255, 12 / 255)
const WHITE = rgb(1, 1, 1)
const PLACEHOLDER_URL = 'https://thememorytrail.ie'

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

  if (!setup.coverPhotoBlob) {
    throw new Error('Cover photo is required')
  }

  const coverImage = await embedImage(doc, setup.coverPhotoBlob)
  const page1 = doc.addPage([A6_WIDTH, A6_HEIGHT])

  const imgScale = Math.max(
    A6_WIDTH / coverImage.width,
    A6_HEIGHT / coverImage.height
  )
  const imgW = coverImage.width * imgScale
  const imgH = coverImage.height * imgScale
  const imgX = (A6_WIDTH - imgW) / 2
  const imgY = A6_HEIGHT - imgH

  page1.drawImage(coverImage, {
    x: imgX,
    y: imgY,
    width: imgW,
    height: imgH,
  })

  const overlayHeight = A6_HEIGHT / 3
  page1.drawRectangle({
    x: 0,
    y: A6_HEIGHT - overlayHeight,
    width: A6_WIDTH,
    height: overlayHeight,
    color: TEAL,
    opacity: 0.7,
  })

  page1.drawText('The Memory Trail', {
    x: 20,
    y: A6_HEIGHT - 30,
    size: 10,
    font: helvetica,
    color: WHITE,
  })

  const titleSize = 22
  const titleWidth = helveticaBold.widthOfTextAtSize(
    setup.coverTitle.toUpperCase(),
    titleSize
  )
  page1.drawText(setup.coverTitle.toUpperCase(), {
    x: (A6_WIDTH - titleWidth) / 2,
    y: A6_HEIGHT - overlayHeight / 2 - titleSize / 2,
    size: titleSize,
    font: helveticaBold,
    color: WHITE,
  })

  const barHeight = 30
  page1.drawRectangle({
    x: 0,
    y: 0,
    width: A6_WIDTH,
    height: barHeight,
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
  page2.drawText('FUNDED AND SUPPORTED BY', {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize('FUNDED AND SUPPORTED BY', 14) / 2,
    y: A6_HEIGHT - 40,
    size: 14,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  let logoY = A6_HEIGHT - 110
  const logoSize = 60
  const logosPerRow = 2
  for (let i = 0; i < setup.funderLogos.length; i++) {
    const col = i % logosPerRow
    const row = Math.floor(i / logosPerRow)
    const x = (A6_WIDTH - logosPerRow * (logoSize + 20)) / 2 + col * (logoSize + 20)
    const y = logoY - row * (logoSize + 20)
    try {
      const logoBytes = await blobToUint8Array(setup.funderLogos[i])
      const logoImg = isPng(setup.funderLogos[i])
        ? await doc.embedPng(logoBytes)
        : await doc.embedJpg(logoBytes)
      const scale = Math.min(logoSize / logoImg.width, logoSize / logoImg.height)
      page2.drawImage(logoImg, {
        x,
        y,
        width: logoImg.width * scale,
        height: logoImg.height * scale,
      })
    } catch {
      /* Skip logo if embedding fails (e.g. invalid image) */
    }
  }
  logoY -= setup.funderLogos.length > 0 ? Math.ceil(setup.funderLogos.length / logosPerRow) * (logoSize + 30) : 0

  page2.drawText(setup.groupName, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(setup.groupName, 12) / 2,
    y: logoY - 30,
    size: 12,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  const creditsLines = setup.creditsText.split('\n').filter(Boolean)
  let creditsY = logoY - 60
  for (const line of creditsLines) {
    if (creditsY < 80) break
    const maxWidth = A6_WIDTH - 40
    const words = line.split(/\s+/)
    let currentLine = ''
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 10) > maxWidth) {
        if (currentLine) {
          const lw = helvetica.widthOfTextAtSize(currentLine, 10)
          page2.drawText(currentLine, {
            x: (A6_WIDTH - lw) / 2,
            y: creditsY,
            size: 10,
            font: helvetica,
            color: NEAR_BLACK,
          })
          creditsY -= 14
        }
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine && creditsY > 80) {
      const lw = helvetica.widthOfTextAtSize(currentLine, 10)
      page2.drawText(currentLine, {
        x: (A6_WIDTH - lw) / 2,
        y: creditsY,
        size: 10,
        font: helvetica,
        color: NEAR_BLACK,
      })
      creditsY -= 14
    }
  }

  page2.drawText('Content licensed under CC BY-NC-ND', {
    x: A6_WIDTH / 2 - helvetica.widthOfTextAtSize('Content licensed under CC BY-NC-ND', 8) / 2,
    y: 20,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  const page3 = doc.addPage([A6_WIDTH, A6_HEIGHT])
  const introHeaderHeight = 35
  page3.drawRectangle({
    x: 0,
    y: A6_HEIGHT - introHeaderHeight,
    width: A6_WIDTH,
    height: introHeaderHeight,
    color: TEAL,
  })
  page3.drawText('INTRODUCTION', {
    x: 20,
    y: A6_HEIGHT - introHeaderHeight + 10,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  })

  const introY = A6_HEIGHT - introHeaderHeight - 30
  const introChunk = setup.introText.substring(0, 800)
  const introWords = introChunk.split(/\s+/)
  let line = ''
  let y = introY
  for (const word of introWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 11) > A6_WIDTH - 40) {
      if (line && y > 60) {
        page3.drawText(line, { x: 20, y, size: 11, font: helvetica, color: NEAR_BLACK })
        y -= 14
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && y > 60) {
    page3.drawText(line, { x: 20, y, size: 11, font: helvetica, color: NEAR_BLACK })
    y -= 14
  }
  page3.drawText(setup.groupName, {
    x: 20,
    y: 30,
    size: 9,
    font: helvetica,
    color: NEAR_BLACK,
  })

  for (let i = 0; i < validatedPois.length; i++) {
    const poi = validatedPois[i]
    const poiPage = doc.addPage([A6_WIDTH, A6_HEIGHT])
    
    // Hero photo at top (~40% of page height)
    const photoBlob = poi.thumbnailBlob
    const photoBytes = await blobToUint8Array(photoBlob)
    const photoImg = isPng(photoBlob)
      ? await doc.embedPng(photoBytes)
      : await doc.embedJpg(photoBytes)
    
    const photoHeight = A6_HEIGHT * 0.4
    const photoScale = Math.min(
      A6_WIDTH / photoImg.width,
      photoHeight / photoImg.height
    )
    const photoW = photoImg.width * photoScale
    const photoH = photoImg.height * photoScale
    const photoX = (A6_WIDTH - photoW) / 2
    const photoY = A6_HEIGHT - photoH
    
    poiPage.drawImage(photoImg, {
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
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
    const divider2Y = 45
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

  const mapPage = doc.addPage([A6_WIDTH, A6_HEIGHT])
  const mapHeaderH = 35
  mapPage.drawRectangle({
    x: 0,
    y: A6_HEIGHT - mapHeaderH,
    width: A6_WIDTH,
    height: mapHeaderH,
    color: TEAL,
  })
  mapPage.drawText('MAP', {
    x: 20,
    y: A6_HEIGHT - mapHeaderH + 10,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  })

  // If map blob exists, embed it; otherwise show coordinates list
  console.log('[PDF] Map blob in setup:', setup.mapBlob ? `${setup.mapBlob.size} bytes` : 'null')
  if (setup.mapBlob) {
    try {
      console.log('[PDF] Attempting to embed map image...')
      const mapImg = await embedImage(doc, setup.mapBlob)
      console.log('[PDF] Map image embedded:', mapImg.width, 'x', mapImg.height)
      const mapAreaHeight = A6_HEIGHT - mapHeaderH - 40
      const mapScale = Math.min(
        (A6_WIDTH - 40) / mapImg.width,
        mapAreaHeight / mapImg.height
      )
      const mapW = mapImg.width * mapScale
      const mapH = mapImg.height * mapScale
      const mapX = (A6_WIDTH - mapW) / 2
      const mapY = A6_HEIGHT - mapHeaderH - 20 - mapH

      mapPage.drawImage(mapImg, {
        x: mapX,
        y: mapY,
        width: mapW,
        height: mapH,
      })
      console.log('[PDF] Map image drawn successfully')
    } catch (err) {
      console.error('Failed to embed map image:', err)
      // Fall through to coordinates list
    }
  } else {
    console.log('[PDF] No map blob - skipping map embed')
  }

  // Add coordinates list at bottom
  let coordY = 60
  for (const poi of validatedPois.slice(0, 3)) { // Show first 3 for space
    if (poi.latitude != null && poi.longitude != null && coordY > 20) {
      const ns = poi.latitude >= 0 ? 'N' : 'S'
      const ew = poi.longitude >= 0 ? 'E' : 'W'
      const line = `${poi.sequence}. ${Math.abs(poi.latitude).toFixed(4)}° ${ns}, ${Math.abs(poi.longitude).toFixed(4)}° ${ew}`
      mapPage.drawText(line, {
        x: 20,
        y: coordY,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
      coordY -= 12
    }
  }
  if (validatedPois.length > 3) {
    mapPage.drawText(
      'Full GPS coordinates included in ZIP export',
      {
        x: 20,
        y: coordY - 2,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      }
    )
  }

  const pdfBytes = await doc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
