declare module 'piexifjs' {
  interface ExifDict {
    '0th'?: Record<number, unknown>
    Exif?: Record<number, unknown>
    GPS?: Record<number, unknown>
    [key: string]: Record<number, unknown> | unknown | undefined
  }

  const piexif: {
    load: (data: string) => ExifDict
    dump: (exifDict: ExifDict) => string
    insert: (exif: string, jpeg: string) => string
    remove: (jpeg: string) => string
    GPSIFD: {
      GPSLatitudeRef: number
      GPSLatitude: number
      GPSLongitudeRef: number
      GPSLongitude: number
    }
  }
  export default piexif
}
