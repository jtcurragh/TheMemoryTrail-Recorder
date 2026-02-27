import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPOIById, updatePOI, getPOIsByTrailId } from '../db/pois'
import { useGPS } from '../hooks/useGPS'
import type { POIRecord, POICategory, PhotoRotation, CoordinateSource } from '../types'
import { PARISH_CATEGORIES, GRAVEYARD_CATEGORIES } from '../config/categories'

function parsePastedCoords(value: string): { lat: number; lon: number } | null {
  const parts = value.split(',').map((s) => s.trim())
  if (parts.length !== 2) return null
  const lat = Number.parseFloat(parts[0])
  const lon = Number.parseFloat(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

function PhotoImage({
  blob,
  alt,
  rotation = 0,
}: {
  blob: Blob
  alt: string
  rotation?: PhotoRotation
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return <div className="w-full max-h-48 bg-govuk-background animate-pulse" />
  return (
    <div className="w-full max-h-48 overflow-hidden bg-govuk-background">
      <img
        src={src}
        alt={alt}
        className="w-full max-h-48 object-contain"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </div>
  )
}

function formatGps(lat: number, lon: number, accuracy: number | null): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  const acc = accuracy != null ? ` (±${accuracy}m)` : ''
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}${acc}`
}

export function POIDetailScreen() {
  const { poiId } = useParams<{ poiId: string }>()
  const navigate = useNavigate()
  const { latitude: gpsLat, longitude: gpsLon, accuracy: gpsAccuracy, status: gpsStatus, recordLocation, clearPosition } = useGPS()
  const gpsTriggeredRef = useRef(false)

  const [poi, setPoi] = useState<POIRecord | null>(null)
  const [trailPois, setTrailPois] = useState<POIRecord[]>([])
  const [siteName, setSiteName] = useState('')
  const [category, setCategory] = useState<POICategory>('Other')
  const [story, setStory] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rotation, setRotation] = useState<PhotoRotation>(0)
  const [editLat, setEditLat] = useState<number | null>(null)
  const [editLon, setEditLon] = useState<number | null>(null)
  const [editAccuracy, setEditAccuracy] = useState<number | null>(null)
  const [editCoordinateSource, setEditCoordinateSource] = useState<CoordinateSource>(null)
  const [overrideLocationExpanded, setOverrideLocationExpanded] = useState(false)
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [locationSetSuccess, setLocationSetSuccess] = useState(false)

  useEffect(() => {
    if (!poiId) return
    getPOIById(poiId, { includeBlobs: true }).then((p) => {
      setPoi(p ?? null)
      if (p) {
        getPOIsByTrailId(p.trailId, { includeBlobs: false }).then((pois) => {
          setTrailPois(pois.sort((a, b) => a.sequence - b.sequence))
        })
      }
    })
  }, [poiId])

  useEffect(() => {
    if (poi) {
      setSiteName(poi.siteName)
      setCategory(poi.category)
      setStory(poi.story)
      setUrl(poi.url)
      setNotes(poi.notes)
      setRotation(poi.rotation ?? 0)
      setEditLat(poi.latitude)
      setEditLon(poi.longitude)
      setEditAccuracy(poi.accuracy)
      setEditCoordinateSource(poi.coordinateSource ?? null)
      setOverrideLocationExpanded(false)
      setPasteInput('')
      setPasteError(null)
    }
  }, [poi])

  useEffect(() => {
    if (gpsTriggeredRef.current && gpsStatus === 'success' && gpsLat != null && gpsLon != null && poi) {
      gpsTriggeredRef.current = false
      const applyGps = async () => {
        setEditLat(gpsLat)
        setEditLon(gpsLon)
        setEditAccuracy(gpsAccuracy)
        setEditCoordinateSource('gps_capture')
        setPoi((prev) => (prev ? { ...prev, latitude: gpsLat, longitude: gpsLon, accuracy: gpsAccuracy, coordinateSource: 'gps_capture' } : null))
        try {
          await updatePOI(poi.id, { latitude: gpsLat, longitude: gpsLon, accuracy: gpsAccuracy, coordinateSource: 'gps_capture' })
          setLocationSetSuccess(true)
          setTimeout(() => setLocationSetSuccess(false), 3000)
          clearPosition()
        } catch (err) {
          console.error('Failed to save location:', err)
        }
      }
      void applyGps()
    }
  }, [gpsStatus, gpsLat, gpsLon, gpsAccuracy, poi, clearPosition])

  const handleSave = useCallback(async () => {
    if (!poi) return
    setSaving(true)
    setSaved(false)
    try {
      await updatePOI(poi.id, {
        siteName,
        category,
        story,
        url,
        notes,
        latitude: editLat,
        longitude: editLon,
        accuracy: editAccuracy,
        coordinateSource: editCoordinateSource,
      })
      setPoi((prev) => (prev ? { ...prev, latitude: editLat, longitude: editLon, accuracy: editAccuracy, coordinateSource: editCoordinateSource ?? undefined } : null))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }, [poi, siteName, category, story, url, notes, editLat, editLon, editAccuracy, editCoordinateSource])

  const handleRotate = useCallback(async () => {
    if (!poi) return
    const next: PhotoRotation[] = [0, 90, 180, 270]
    const idx = next.indexOf(rotation)
    const newRotation = next[(idx + 1) % 4]
    setRotation(newRotation)
    try {
      await updatePOI(poi.id, { rotation: newRotation })
    } catch (err) {
      console.error('Failed to save rotation:', err)
    }
  }, [poi, rotation])

  const handleNavigate = useCallback(
    async (direction: 'prev' | 'next') => {
      if (!poi || trailPois.length === 0) return
      await handleSave()
      const currentIdx = trailPois.findIndex((p) => p.id === poi.id)
      if (currentIdx < 0) return
      const newIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1
      if (newIdx < 0 || newIdx >= trailPois.length) return
      navigate(`/trail/poi/${trailPois[newIdx].id}`)
    },
    [poi, trailPois, navigate, handleSave]
  )

  const handleUseCurrentLocation = useCallback(() => {
    gpsTriggeredRef.current = true
    recordLocation()
  }, [recordLocation])

  const handlePasteChange = useCallback(
    (value: string) => {
      setPasteInput(value)
      const parsed = parsePastedCoords(value)
      if (!value.trim()) {
        setPasteError(null)
        return
      }
      if (!parsed) {
        setPasteError('Format not recognised. Use "lat, lon" e.g. 53.3498, -6.2603')
        return
      }
      setPasteError(null)
      const applyManual = async () => {
        if (!poi) return
        setEditLat(parsed.lat)
        setEditLon(parsed.lon)
        setEditAccuracy(null)
        setEditCoordinateSource('manual')
        setPoi((prev) => (prev ? { ...prev, latitude: parsed.lat, longitude: parsed.lon, accuracy: null, coordinateSource: 'manual' } : null))
        try {
          await updatePOI(poi.id, { latitude: parsed.lat, longitude: parsed.lon, accuracy: null, coordinateSource: 'manual' })
          setLocationSetSuccess(true)
          setTimeout(() => setLocationSetSuccess(false), 3000)
          setPasteInput('')
        } catch (err) {
          console.error('Failed to save location:', err)
        }
      }
      void applyManual()
    },
    [poi]
  )

  const currentIndex = poi && trailPois.length > 0 
    ? trailPois.findIndex((p) => p.id === poi.id) 
    : -1
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < trailPois.length - 1

  if (!poiId) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">Invalid POI</p>
        <button
          type="button"
          onClick={() => navigate('/trail')}
          className="mt-4 min-h-[56px] px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-lg"
        >
          Back to Trail
        </button>
      </main>
    )
  }

  if (!poi) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">Loading...</p>
      </main>
    )
  }

  const hasGps =
    editLat != null &&
    editLon != null &&
    !Number.isNaN(editLat) &&
    !Number.isNaN(editLon)

  const categorySource =
    poi.trailType === 'graveyard' ? GRAVEYARD_CATEGORIES : PARISH_CATEGORIES

  const categoriesByGroup = categorySource.reduce<
    Record<string, { value: string; label: string }[]>
  >((acc, c) => {
    if (!acc[c.group]) acc[c.group] = []
    acc[c.group].push({ value: c.value, label: c.label })
    return acc
  }, {})

  // Include legacy category if not in the current category list
  const allLabels = categorySource.map((c) => c.label)
  if (category && !allLabels.includes(category)) {
    if (!categoriesByGroup['Other']) categoriesByGroup['Other'] = []
    categoriesByGroup['Other'] = [
      { value: category, label: category },
      ...categoriesByGroup['Other'],
    ]
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/trail')}
        className="mb-4 flex items-center gap-2 text-[#2d7a6e] font-bold text-lg"
        aria-label="Back to trail"
      >
        ← Back to Trail
      </button>

      {trailPois.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleNavigate('prev')}
            disabled={!hasPrevious || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Previous POI"
          >
            ← Previous
          </button>
          <span className="text-[#595959] text-sm whitespace-nowrap">
            {currentIndex + 1} of {trailPois.length}
          </span>
          <button
            type="button"
            onClick={() => void handleNavigate('next')}
            disabled={!hasNext || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Next POI"
          >
            Next →
          </button>
        </div>
      )}

      <div className="relative">
        <PhotoImage
          blob={poi.photoBlob}
          alt={siteName || poi.filename}
          rotation={rotation}
        />
        <button
          type="button"
          onClick={() => void handleRotate()}
          aria-label="Rotate photo clockwise"
          className="absolute bottom-2 right-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-[#2d7a6e] text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-tmt-focus focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      <div className="mt-4 space-y-1 text-[#595959] text-sm">
        <p>
          <span className="font-bold">File:</span>{' '}
          <span className="text-xs text-[#9ca3af] font-normal">{poi.filename}</span>
        </p>
        {hasGps && (
          <p>
            <span className="font-bold">GPS:</span>{' '}
            {formatGps(editLat!, editLon!, editAccuracy)}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSave()
        }}
        className="mt-6 space-y-4"
      >
        <div className="p-4 bg-white rounded-lg border-2 border-[#e0e0e0] shadow-sm">
          <h2 className="text-lg font-bold text-[#1a2a2a] mb-3">Location</h2>
          {locationSetSuccess && (
            <p className="mb-3 flex items-center gap-2 text-govuk-green font-semibold" role="status">
              <span aria-hidden>📍</span>
              Location set successfully.
            </p>
          )}
          {!hasGps ? (
            <div className="space-y-4">
              <p className="text-[#595959] text-sm">This POI has no coordinates. Set a location using one of the options below.</p>
              <div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gpsStatus === 'loading'}
                  className="w-full min-h-[48px] px-4 py-3 border-2 border-[#2d7a6e] bg-[#2d7a6e] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#256b60] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
                  aria-label="Use my current location"
                >
                  {gpsStatus === 'loading' ? (
                    <>
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <span aria-hidden>📍</span>
                      Use My Current Location
                    </>
                  )}
                </button>
                {gpsStatus === 'error' && (
                  <p className="mt-2 text-govuk-red text-sm">Location unavailable — try the Google Maps option below.</p>
                )}
              </div>
              <div>
                <label htmlFor="pasteCoords" className="block text-sm font-bold text-[#1a2a2a] mb-1">
                  Paste from Google Maps
                </label>
                <input
                  id="pasteCoords"
                  type="text"
                  value={pasteInput}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  placeholder="53.3498, -6.2603"
                  className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
                  aria-describedby={pasteError ? 'pasteError' : 'pasteHelp'}
                  aria-invalid={!!pasteError}
                />
                <p id="pasteHelp" className="mt-1 text-sm text-[#595959]">
                  Right-click your location in Google Maps, click the coordinates to copy, then paste here.
                </p>
                {pasteError && (
                  <p id="pasteError" className="mt-1 text-sm text-govuk-red" role="alert">
                    {pasteError}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[#1a2a2a] font-medium">
                <span aria-hidden>📍</span>
                {editLat!.toFixed(4)}, {editLon!.toFixed(4)}
              </p>
              <button
                type="button"
                onClick={() => setOverrideLocationExpanded((e) => !e)}
                className="min-h-[48px] px-4 border-2 border-[#2d7a6e] text-[#2d7a6e] bg-white font-bold rounded-lg hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
              >
                {overrideLocationExpanded ? 'Hide override options' : 'Override location'}
              </button>
              {overrideLocationExpanded && (
                <div className="mt-3 pt-3 border-t border-[#e0e0e0] space-y-4">
                  <div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={gpsStatus === 'loading'}
                      className="w-full min-h-[48px] px-4 py-3 border-2 border-[#2d7a6e] bg-[#2d7a6e] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#256b60] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
                      aria-label="Use my current location"
                    >
                      {gpsStatus === 'loading' ? (
                        <>
                          <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                          Getting location...
                        </>
                      ) : (
                        <>
                          <span aria-hidden>📍</span>
                          Use My Current Location
                        </>
                      )}
                    </button>
                    {gpsStatus === 'error' && (
                      <p className="mt-2 text-govuk-red text-sm">Location unavailable — try the Google Maps option below.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="pasteCoordsOverride" className="block text-sm font-bold text-[#1a2a2a] mb-1">
                      Paste from Google Maps
                    </label>
                    <input
                      id="pasteCoordsOverride"
                      type="text"
                      value={pasteInput}
                      onChange={(e) => handlePasteChange(e.target.value)}
                      placeholder="53.3498, -6.2603"
                      className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
                      aria-describedby={pasteError ? 'pasteErrorOverride' : 'pasteHelpOverride'}
                      aria-invalid={!!pasteError}
                    />
                    <p id="pasteHelpOverride" className="mt-1 text-sm text-[#595959]">
                      Right-click your location in Google Maps, click the coordinates to copy, then paste here.
                    </p>
                    {pasteError && (
                      <p id="pasteErrorOverride" className="mt-1 text-sm text-govuk-red" role="alert">
                        {pasteError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="siteName"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Site name (title) <span className="text-govuk-red">*</span>
          </label>
          <input
            id="siteName"
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. O'Connell memorial cross"
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
          />
        </div>

        <div>
          <label
            id="category-label"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Category <span className="text-govuk-red">*</span>
          </label>
          <div
            role="group"
            aria-labelledby="category-label"
            className="space-y-4"
          >
            {Object.entries(categoriesByGroup).map(([groupName, items]) => (
              <div key={groupName}>
                <p className="text-sm font-semibold text-[#595959] mb-2">
                  {groupName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCategory(item.label as POICategory)}
                      aria-pressed={category === item.label}
                      className={`min-h-[48px] px-4 py-2 font-bold border-2 rounded-full ${
                        category === item.label
                          ? 'bg-[#2d7a6e] border-[#2d7a6e] text-white'
                          : 'bg-white border-[#2d7a6e] text-[#2d7a6e]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="story"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Story (max 55 words) <span className="text-govuk-red">*</span>
          </label>
          <textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Add your story here (max 55 words). Or write it in Word and add it when you export."
            rows={8}
            className="block w-full px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg resize-y"
          />
          <p className="mt-1 text-sm text-[#595959]">
            {story.trim().split(/\s+/).filter(Boolean).length} / 55 words
          </p>
        </div>

        <div>
          <label
            htmlFor="url"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Website URL (for QR code)
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
          />
          <p className="mt-1 text-sm text-[#595959]">
            Optional — a QR code will be generated for the brochure
          </p>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-lg font-bold text-[#1a2a2a] mb-2"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other observations (for your reference only)"
            rows={2}
            className="block w-full px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`min-h-[56px] w-full font-bold text-lg rounded-lg disabled:opacity-50 ${
            saved
              ? 'bg-govuk-green text-white'
              : 'bg-[#2d7a6e] text-white'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </form>

      <p className="mt-4 text-[#595959] text-sm">
        <span className="text-govuk-red">*</span> Required fields for brochure. You can also write your story in Word and add it when you export.
      </p>

      {trailPois.length > 1 && (
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleNavigate('prev')}
            disabled={!hasPrevious || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Previous POI"
          >
            ← Previous
          </button>
          <span className="text-[#595959] text-sm whitespace-nowrap">
            {currentIndex + 1} of {trailPois.length}
          </span>
          <button
            type="button"
            onClick={() => void handleNavigate('next')}
            disabled={!hasNext || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Next POI"
          >
            Next →
          </button>
        </div>
      )}
    </main>
  )
}
