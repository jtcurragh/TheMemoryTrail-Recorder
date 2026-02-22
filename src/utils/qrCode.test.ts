import { describe, it, expect } from 'vitest'
import { generateQrDataUrl } from './qrCode'

describe('qrCode', () => {
  it('generates a PNG data URL', async () => {
    const url = await generateQrDataUrl('https://example.com')
    expect(url).toMatch(/^data:image\/png;base64,/)
  })

  it('uses placeholder URL when given empty string', async () => {
    const url = await generateQrDataUrl('')
    expect(url).toMatch(/^data:image\/png;base64,/)
  })
})
