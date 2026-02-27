import { useEffect, useRef, useState, useCallback } from 'react'
import { useTrail } from '../hooks/useTrail'
import { useHideBottomNav } from '../hooks/useHideBottomNav'
import { useCamera } from '../hooks/useCamera'
import { useGPS } from '../hooks/useGPS'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { createPOI } from '../db/pois'
import { incrementTrailSequence } from '../db/trails'
import { generatePOIId } from '../utils/idGeneration'
import { generateThumbnail } from '../utils/thumbnail'
import { embedGpsInJpeg, extractGpsFromJpeg } from '../utils/exif'
import { CameraGuideOverlay } from '../components/CameraGuideOverlay'
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
  const [successMessage, setSuccessMessage] = useState<{ prefix: string; filename: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [gpsSource, setGpsSource] = useState<'device' | 'exif' | 'none'>('none')
  const [exifGps, setExifGps] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)

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
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return

    e.target.value = ''

    if (files.length === 1) {
      const file = files[0]
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
      return
    }

    if (!trail || !activeTrailId || savingRef.current) return
    const total = Math.min(files.length, MAX_POIS - poiCount)
    if (total <= 0) return

    savingRef.current = true
    setImportProgress({ current: 0, total })
    setSaving(true)

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    let sequence = trail.nextSequence
    let imported = 0

    try {
      for (let i = 0; i < total; i++) {
        setImportProgress({ current: i, total })

        const file = files[i]
        let finalLat = latitude
        let finalLon = longitude
        let finalAccuracy = accuracy

        const gpsData = await extractGpsFromJpeg(file)
        let coordinateSource: 'exif' | 'gps_capture' | null = null
        if (gpsData) {
          finalLat = gpsData.latitude
          finalLon = gpsData.longitude
          finalAccuracy = gpsData.accuracy
          coordinateSource = 'exif'
        } else if (gpsStatus === 'success') {
          finalLat = latitude
          finalLon = longitude
          coordinateSource = 'gps_capture'
        }

        let photoBlob: Blob = file
        if (finalLat !== null && finalLon !== null && !isIOS) {
          photoBlob = await embedGpsInJpeg(file, finalLat, finalLon)
        }

        let thumbnailBlob: Blob
        try {
          thumbnailBlob = await generateThumbnail(photoBlob)
        } catch {
          thumbnailBlob = photoBlob
        }

        await createPOI({
          trailId: trail.id,
          groupCode: trail.groupCode,
          trailType: trail.trailType,
          sequence,
          photoBlob,
          thumbnailBlob,
          latitude: finalLat,
          longitude: finalLon,
          accuracy: finalAccuracy,
          capturedAt: new Date().toISOString(),
          coordinateSource: coordinateSource ?? undefined,
        })
        await incrementTrailSequence(trail.id)
        sequence++
        imported++
      }

      setImportProgress({ current: total, total })
      await new Promise((r) => setTimeout(r, 500))
      setImportProgress(null)

      setSuccessMessage({ prefix: `Imported ${imported} photo${imported !== 1 ? 's' : ''} — `, filename: '' })
      setTimeout(() => setSuccessMessage(null), 2000)
      await loadTrailState()
    } catch (err) {
      console.error('Failed to import photos:', err)
      setSuccessMessage({ prefix: `Imported ${imported} of ${total}. Error: `, filename: err instanceof Error ? err.message : 'Unknown' })
      setTimeout(() => setSuccessMessage(null), 3000)
      await new Promise((r) => setTimeout(r, 500))
      setImportProgress(null)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
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
    setImportProgress({ current: 0, total: 1 })
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

      const coordinateSource =
        gpsSource === 'exif' ? 'exif' : gpsSource === 'device' ? 'gps_capture' : null
      const poi = await createPOI({
        trailId: trail.id,
        groupCode: trail.groupCode,
        trailType: trail.trailType,
        sequence,
        photoBlob,
        thumbnailBlob,
        latitude: finalLat,
        longitude: finalLon,
        accuracy: finalAccuracy,
        capturedAt: new Date().toISOString(),
        coordinateSource,
      })
      await incrementTrailSequence(trail.id)

      setImportProgress({ current: 1, total: 1 })
      await new Promise((r) => setTimeout(r, 500))
      setImportProgress(null)

      setSuccessMessage({ prefix: 'Saved — ', filename: poi.filename })
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
      setImportProgress(null)
    } finally {
      savingRef.current = false
      setSaving(false)
      clearPosition()
    }
  }

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-4">Capture</h1>
        <p className="text-lg text-[#0b0c0c]">
          Open a trail from Trails first to start capturing POIs.
        </p>
      </main>
    )
  }

  if (!trail) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">Loading...</p>
      </main>
    )
  }

  const isFull = poiCount >= MAX_POIS
  const nextId = generatePOIId(trail.groupCode, trail.trailType)

  if (isFull) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-4">
          Capture — {trail.displayName}
        </h1>
        <p className="text-lg text-[#0b0c0c]">
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
              <CameraGuideOverlay />
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isReady}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white border-4 border-govuk-text flex items-center justify-center shadow-lg disabled:opacity-50"
                aria-label="Capture photo"
              >
                <span className="w-16 h-16 rounded-full bg-[#2d7a6e]" aria-hidden />
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
            <span>NEXT <span className="text-xs text-[#9ca3af] font-normal">{nextId}</span></span>
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
            className="bg-[#2d7a6e] text-white text-center text-lg font-bold py-3 px-4 shrink-0"
            role="status"
            aria-live="polite"
          >
            {successMessage.prefix}
            <span className="text-xs text-[#9ca3af] font-normal">{successMessage.filename}</span>
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
          <div className="shrink-0 p-4 bg-white border-t border-[#e0e0e0]">
            {importProgress && (
              <div className="mb-3 p-3 bg-[#f5f5f0] rounded-[12px] border-2 border-[#2d7a6e]" role="status" aria-live="polite">
                <p className="text-[#0b0c0c] font-bold mb-2">
                  {importProgress.current} of {importProgress.total} photos processed
                </p>
                <progress
                  value={importProgress.current}
                  max={importProgress.total}
                  className="w-full h-3 rounded-full [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-[#2d7a6e] [&::-moz-progress-bar]:bg-[#2d7a6e]"
                />
              </div>
            )}
            <p className="text-[#1a2a2a] font-bold text-center mb-2 text-base">
              Is the site clearly visible?
            </p>
            <p className={`text-sm text-center mb-3 ${hasGpsData ? 'text-govuk-green' : 'text-[#b45309]'}`}>
              {gpsMessage}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 min-h-[56px] bg-white text-govuk-red border-2 border-govuk-red text-lg font-bold rounded-[12px]"
                aria-label="Retake photo"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 min-h-[56px] bg-[#2d7a6e] text-white text-lg font-bold rounded-[12px] disabled:opacity-50"
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
            className="bg-[#2d7a6e] text-white text-center text-lg font-bold py-3 px-4"
            role="status"
            aria-live="polite"
          >
            {successMessage.prefix}
            <span className="text-xs text-[#9ca3af] font-normal">{successMessage.filename}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center bg-[#1a2a2a] p-6">
          <span className="text-6xl mb-4 block" aria-hidden>📷</span>
          <p className="text-white text-xl font-bold mb-2 text-center">
            Tap 1 to record location each time
          </p>
          <p className="text-white/80 text-base text-center">
            Then tap 2 for photo
          </p>
        </div>

        <div className="px-5 py-5 bg-white shrink-0 rounded-t-xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] border-t border-[#e0e0e0]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xl font-semibold text-[#1a2a2a]">NEXT <span className="text-xs text-[#9ca3af] font-normal">{nextId}</span></p>
            <span className="bg-[#e0e0e0] text-[#0b0c0c] text-sm font-semibold px-3 py-1 rounded-full">
              {poiCount} of {MAX_POIS} recorded
            </span>
          </div>

          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={recordLocation}
              disabled={gpsStatus === 'loading'}
              className={`flex-1 min-h-[56px] border-2 text-lg font-bold rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-50 ${
                gpsStatus === 'success'
                  ? 'bg-govuk-green border-govuk-green text-white'
                  : 'bg-white border-[#2d7a6e] text-[#2d7a6e]'
              }`}
              aria-label="1. Record GPS location"
            >
              <span aria-hidden>📍</span>
              1. Record Location
            </button>
            <button
              type="button"
              onClick={handleStartCamera}
              className="flex-1 min-h-[56px] border-2 border-[#2d7a6e] text-[#2d7a6e] bg-white text-lg font-bold rounded-[12px] flex items-center justify-center gap-2"
              aria-label="2. Take Photo – start camera"
            >
              <span aria-hidden>📷</span>
              2. Take Photo
            </button>
          </div>

          {importProgress && (
            <div className="mb-3 p-4 bg-[#f5f5f0] rounded-[12px] border-2 border-[#2d7a6e]" role="status" aria-live="polite">
              <p className="text-[#0b0c0c] font-bold mb-2">
                {importProgress.current} of {importProgress.total} photos processed
              </p>
              <progress
                value={importProgress.current}
                max={importProgress.total}
                className="w-full h-3 rounded-full [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-[#2d7a6e] [&::-moz-progress-bar]:bg-[#2d7a6e]"
              />
            </div>
          )}
          <div className="mb-3">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="photo-upload"
              aria-label="Choose photo from gallery"
              disabled={!!importProgress}
            />
            <label
              htmlFor="photo-upload"
              className={`block w-full min-h-[56px] border-2 border-[#2d7a6e] text-[#2d7a6e] bg-white text-lg font-bold rounded-[12px] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#f5f5f0] ${importProgress ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span aria-hidden>🖼️</span>
              Choose from Gallery
            </label>
          </div>

          <p className="text-base text-[#0b0c0c] text-center" aria-live="polite">
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
