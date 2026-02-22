import QRCode from 'qrcode'

const PLACEHOLDER_URL = 'https://thememorytrail.ie'

export async function generateQrDataUrl(url: string): Promise<string> {
  const target = url.trim() || PLACEHOLDER_URL
  return QRCode.toDataURL(target, {
    type: 'image/png',
    margin: 1,
    width: 200,
  })
}
