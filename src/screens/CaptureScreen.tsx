import { useEffect, useRef, useState, useCallback } from 'react'
import { useTrail } from '../hooks/useTrail'
import { useHideBottomNav } from '../hooks/useHideBottomNav'
import { useCamera } from '../hooks/useCamera'
import { useGPS } from '../hooks/useGPS'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { createPOI } from '../db/pois'
import { incrementTrailSequence } from '../db/trails'
import { generatePOIId, generateFilename } from '../utils/idGeneration'
import { generateThumbnail } from '../utils/thumbnail'
import { embedGpsInJpeg, extractGpsFromJpeg } from '../utils/exif'
import type { Trail } from '../types'

const MAX_POIS = 12

type CaptureState = 'idle' | 'live' | 'preview'

export function CaptureScreen() {
  const { activeTrailId } = useTrail()
  const {
    videoRef,
    isReady,
    error: cameraError,
    stopCamera,
    captureFrame,
    ensureCameraRunning,
  } = useCamera()
  const { latitude, longitude, accuracy, status: gpsStatus, recordLocation, clearPosition } = useGPS()

  const [trail, setTrail] = useState<Trail | null>(null)
  const [poiCount, setPoiCount] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [gpsSource, setGpsSource] = useState<'device' | 'exif' | 'none'>('none')
  const [exifGps, setExifGps] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null)

  const loadTrailState = useCallback(async () => {
    if (!activeTrailId) return
    const t = await getTrailById(activeTrailId)
    setTrail(t ?? null)
    const pois = await getPOIsByTrailId(activeTrailId, { includeBlobs: false })
    setPoiCount(pois.length)
  }, [activeTrailId])

  useEffect(() => {
    loadTrailState()
    return () => stopCamera()
  }, [stopCamera, loadTrailState])

  const { setHide: setHideBottomNav } = useHideBottomNav()

  useEffect(() => {
    if (captureState === 'live') {
      void ensureCameraRunning()
    }
  }, [captureState, ensureCameraRunning])

  useEffect(() => {
    const hide = captureState === 'live' || captureState === 'preview'
    setHideBottomNav(hide)
    return () => setHideBottomNav(false)
  }, [captureState, setHideBottomNav])

  function handleStartCamera() {
    setCaptureState('live')
    setGpsSource(gpsStatus === 'success' ? 'device' : 'none')
    setExifGps(null)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    // Try to extract GPS from EXIF
    const gpsData = await extractGpsFromJpeg(file)
    if (gpsData) {
      setExifGps(gpsData)
      setGpsSource('exif')
    } else {
      setExifGps(null)
      setGpsSource('none')
    }

    setCapturedBlob(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCaptureState('preview')
    
    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  async function handleCapture() {
    const blob = await captureFrame()
    if (!blob) return
    setCapturedBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
    setCaptureState('preview')
    setGpsSource(gpsStatus === 'success' ? 'device' : 'none')
    setExifGps(null)
  }

  function handleCancelLive() {
    stopCamera()
    setCaptureState('idle')
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    setCaptureState('live')
  }

  async function handleConfirm() {
    if (!capturedBlob || !trail || !activeTrailId) return
    if (savingRef.current) return

    savingRef.current = true
    setSaving(true)
    try {
      // Determine which GPS to use
      let finalLat = latitude
      let finalLon = longitude
      let finalAccuracy = accuracy

      if (gpsSource === 'exif' && exifGps) {
        finalLat = exifGps.latitude
        finalLon = exifGps.longitude
        finalAccuracy = exifGps.accuracy
      }

      let photoBlob = capturedBlob
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      if (finalLat !== null && finalLon !== null && !isIOS && gpsSource === 'device') {
        photoBlob = await embedGpsInJpeg(capturedBlob, finalLat, finalLon)
      }

      let thumbnailBlob: Blob
      try {
        thumbnailBlob = await generateThumbnail(photoBlob)
      } catch {
        thumbnailBlob = photoBlob
      }
      await new Promise((r) => requestAnimationFrame(r))
      const sequence = trail.nextSequence
      const poiId = generatePOIId(trail.groupCode, trail.trailType, sequence)
      const filename = generateFilename(poiId)

      await createPOI({
        trailId: trail.id,
        groupCode: trail.groupCode,
        trailType: trail.trailType,
        sequence,
        filename,
        photoBlob,
        thumbnailBlob,
        latitude: finalLat,
        longitude: finalLon,
        accuracy: finalAccuracy,
        capturedAt: new Date().toISOString(),
      })
      await incrementTrailSequence(trail.id)

      setSuccessMessage(`Saved — ${filename}`)
      setPoiCount((c) => c + 1)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setCapturedBlob(null)
      setPreviewUrl('')
      stopCamera()
      setCaptureState('idle')
      setGpsSource('none')
      setExifGps(null)

      setTimeout(() => setSuccessMessage(null), 1500)
      await loadTrailState()
    } catch (err) {
      console.error('Failed to save photo:', err)
    } finally {
      savingRef.current = false
      setSaving(false)
      clearPosition()
    }
  }

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">Capture</h1>
        <p className="text-lg text-govuk-text">
          Open a trail from Trails first to start capturing POIs.
        </p>
      </main>
    )
  }

  if (!trail) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  const isFull = poiCount >= MAX_POIS
  const nextId = generatePOIId(trail.groupCode, trail.trailType, trail.nextSequence)

  if (isFull) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">
          Capture — {trail.displayName}
        </h1>
        <p className="text-lg text-govuk-text">
          This trail is full. Open a POI to edit it, or export your trail.
        </p>
      </main>
    )
  }

  /* Full-screen live view with overlay controls (nav hidden) */
  if (captureState === 'live') {
    return (
      <div className="fixed inset-0 flex flex-col bg-black">
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            playsInline
            muted
            autoPlay
            aria-label="Camera live view"
          />
          {isReady && (
            <>
              <div
                className="absolute inset-[8%] border-2 border-dashed border-white/50 rounded pointer-events-none"
                aria-hidden
              />
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isReady}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white border-4 border-govuk-text flex items-center justify-center shadow-lg disabled:opacity-50"
                aria-label="Capture photo"
              >
                <span className="w-16 h-16 rounded-full bg-tmt-teal" aria-hidden />
              </button>
            </>
          )}
          {!isReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-white text-lg">Starting camera...</p>
            </div>
          )}
          {cameraError && (
            <p className="absolute inset-0 flex items-center justify-center text-white text-lg p-4 text-center">
              Camera unavailable: {cameraError}
            </p>
          )}
        </div>

        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCancelLive}
              className="text-white font-bold py-1 -ml-1"
              aria-label="Cancel and return"
            >
              ← Cancel
            </button>
            <p className="text-white font-bold truncate flex-1 text-center">Capture — {trail.displayName}</p>
            <span className="w-14 shrink-0" aria-hidden />
          </div>
          <div className="flex justify-between items-center mt-1 text-white/90 text-sm">
            <span>NEXT {nextId}</span>
            <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
              {poiCount} of {MAX_POIS}
            </span>
          </div>
        </div>

        {gpsStatus === 'success' && (
          <p className="absolute bottom-16 left-0 right-0 z-10 text-white/80 text-sm text-center">
            GPS ±{accuracy ? Math.round(accuracy) : '?'}m
          </p>
        )}
      </div>
    )
  }

  /* Preview: photo + Retake/Use Photo in fixed bar, no scroll (nav hidden) */
  if (captureState === 'preview' && previewUrl) {
    const hasGpsData = (gpsSource === 'device' && gpsStatus === 'success') || (gpsSource === 'exif' && exifGps)
    let gpsMessage = 'No location data'
    if (gpsSource === 'device' && gpsStatus === 'success') {
      gpsMessage = `GPS from device (±${accuracy ? Math.round(accuracy) : '?'}m)`
    } else if (gpsSource === 'exif' && exifGps) {
      gpsMessage = 'GPS from photo EXIF'
    }

    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)]">
        {successMessage && (
          <div
            className="bg-tmt-teal text-white text-center text-lg font-bold py-3 px-4 shrink-0"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col bg-black">
          <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Captured heritage site preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="shrink-0 p-4 bg-white border-t-2 border-govuk-border">
            <p className="text-govuk-text font-bold text-center mb-2 text-base">
              Is the site clearly visible?
            </p>
            <p className={`text-sm text-center mb-3 ${hasGpsData ? 'text-govuk-green' : 'text-[#b45309]'}`}>
              {gpsMessage}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 min-h-[56px] bg-white text-govuk-red border-2 border-govuk-red text-lg font-bold rounded-lg"
                aria-label="Retake photo"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 min-h-[56px] bg-tmt-teal text-white text-lg font-bold rounded-lg disabled:opacity-50"
                aria-label="Use this photo"
              >
                {saving ? 'Saving...' : 'Use Photo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* Idle: tap to start camera */
  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <main className="flex-1 flex flex-col">
        {successMessage && (
          <div
            className="bg-tmt-teal text-white text-center text-lg font-bold py-3 px-4"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center bg-govuk-text p-6">
          <span className="text-6xl mb-4 block" aria-hidden>📷</span>
          <p className="text-white text-xl font-bold mb-2 text-center">
            Tap 1 to record location each time
          </p>
          <p className="text-white/80 text-base text-center">
            Then tap 2 for photo
          </p>
        </div>

        <div className="px-4 py-4 bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xl font-bold text-govuk-text">NEXT {nextId}</p>
            <span className="bg-govuk-background text-govuk-text text-sm font-semibold px-3 py-1 rounded-full">
              {poiCount} of {MAX_POIS} recorded
            </span>
          </div>

          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={recordLocation}
              disabled={gpsStatus === 'loading'}
              className={`flex-1 min-h-[56px] border-2 text-lg font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50 ${
                gpsStatus === 'success'
                  ? 'bg-govuk-green border-govuk-green text-white'
                  : 'bg-white border-govuk-border text-govuk-text'
              }`}
              aria-label="1. Record GPS location"
            >
              <span aria-hidden>📍</span>
              1. Record Location
            </button>
            <button
              type="button"
              onClick={handleStartCamera}
              className="flex-1 min-h-[56px] border-2 border-govuk-border text-govuk-text bg-white text-lg font-bold rounded flex items-center justify-center gap-2"
              aria-label="2. Take Photo – start camera"
            >
              <span aria-hidden>📷</span>
              2. Take Photo
            </button>
          </div>

          <div className="mb-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="photo-upload"
              aria-label="Choose photo from gallery"
            />
            <label
              htmlFor="photo-upload"
              className="block w-full min-h-[56px] border-2 border-govuk-border text-govuk-text bg-white text-lg font-bold rounded flex items-center justify-center gap-2 cursor-pointer hover:bg-govuk-background"
            >
              <span aria-hidden>🖼️</span>
              Choose from Gallery
            </label>
          </div>

          <p className="text-base text-govuk-text text-center" aria-live="polite">
            {gpsStatus === 'idle' && 'No GPS — tap Record Location'}
            {gpsStatus === 'loading' && 'Getting location...'}
            {gpsStatus === 'success' &&
              `GPS recorded (±${accuracy ? Math.round(accuracy) : '?'}m)`}
            {gpsStatus === 'error' &&
              'Location unavailable — photos will be saved without GPS.'}
          </p>
        </div>
      </main>
    </div>
  )
}
