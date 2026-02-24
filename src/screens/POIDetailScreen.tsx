import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPOIById, updatePOI, getPOIsByTrailId } from '../db/pois'
import type { POIRecord, POICategory, PhotoRotation } from '../types'

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
    }
  }, [poi])

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
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }, [poi, siteName, category, story, url, notes])

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

  const currentIndex = poi && trailPois.length > 0 
    ? trailPois.findIndex((p) => p.id === poi.id) 
    : -1
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < trailPois.length - 1

  if (!poiId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Invalid POI</p>
        <button
          type="button"
          onClick={() => navigate('/trail')}
          className="mt-4 min-h-[48px] px-6 bg-tmt-teal text-white font-bold"
        >
          Back to Trail
        </button>
      </main>
    )
  }

  if (!poi) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  const hasGps =
    poi.latitude != null &&
    poi.longitude != null &&
    !Number.isNaN(poi.latitude) &&
    !Number.isNaN(poi.longitude)

  const categories: POICategory[] = [
    'Monument',
    'Vernacular Building',
    'Holy Well',
    'Famine Site',
    'Historic Feature',
    'Natural Feature',
    'Grave',
    'Wrought Iron Gate',
    'Timber Gate',
    'Gate Piers',
    'Creamery Stand',
    'Stone Bridge',
    'Iron Bridge',
    'Timber Bridge',
    'Boreen',
    'Sruthán',
    'Stream',
    'River',
    'Lime Kiln',
    'Shed',
    'Post Box',
    'Phone Box',
    'Petrol Pump',
    'Ambush Site',
    'Battle Site',
    'Other',
  ]

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/trail')}
        className="mb-4 flex items-center gap-2 text-tmt-teal font-bold text-lg"
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
            className="flex-1 min-h-[48px] px-4 border-2 border-govuk-border bg-white text-govuk-text font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Previous POI"
          >
            ← Previous
          </button>
          <span className="text-govuk-muted text-sm whitespace-nowrap">
            {currentIndex + 1} of {trailPois.length}
          </span>
          <button
            type="button"
            onClick={() => void handleNavigate('next')}
            disabled={!hasNext || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-govuk-border bg-white text-govuk-text font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
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
          className="absolute bottom-2 right-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-tmt-teal text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-tmt-focus focus:ring-offset-2"
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

      <div className="mt-4 space-y-1 text-govuk-muted text-sm">
        <p>
          <span className="font-bold">File:</span> {poi.filename}
        </p>
        {hasGps && (
          <p>
            <span className="font-bold">GPS:</span>{' '}
            {formatGps(poi.latitude!, poi.longitude!, poi.accuracy)}
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
        <div>
          <label
            htmlFor="siteName"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Site name (title) <span className="text-govuk-red">*</span>
          </label>
          <input
            id="siteName"
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. O'Connell memorial cross"
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
          />
        </div>

        <div>
          <label
            id="category-label"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Category <span className="text-govuk-red">*</span>
          </label>
          <div
            role="group"
            aria-labelledby="category-label"
            className="flex flex-wrap gap-2"
          >
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`min-h-[48px] px-4 py-2 font-bold border-2 ${
                  category === c
                    ? 'bg-tmt-teal border-tmt-teal text-white'
                    : 'bg-white border-govuk-border text-govuk-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="story"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Story (max 55 words) <span className="text-govuk-red">*</span>
          </label>
          <textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Add your story here (max 55 words). Or write it in Word and add it when you export."
            rows={8}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
          <p className="mt-1 text-sm text-govuk-muted">
            {story.trim().split(/\s+/).filter(Boolean).length} / 55 words
          </p>
        </div>

        <div>
          <label
            htmlFor="url"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Website URL (for QR code)
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
          />
          <p className="mt-1 text-sm text-govuk-muted">
            Optional — a QR code will be generated for the brochure
          </p>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other observations (for your reference only)"
            rows={2}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`min-h-[56px] w-full font-bold text-lg disabled:opacity-50 ${
            saved
              ? 'bg-govuk-green text-white'
              : 'bg-tmt-teal text-white'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </form>

      <p className="mt-4 text-govuk-muted text-sm">
        <span className="text-govuk-red">*</span> Required fields for brochure. You can also write your story in Word and add it when you export.
      </p>

      {trailPois.length > 1 && (
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleNavigate('prev')}
            disabled={!hasPrevious || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-govuk-border bg-white text-govuk-text font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Previous POI"
          >
            ← Previous
          </button>
          <span className="text-govuk-muted text-sm whitespace-nowrap">
            {currentIndex + 1} of {trailPois.length}
          </span>
          <button
            type="button"
            onClick={() => void handleNavigate('next')}
            disabled={!hasNext || saving}
            className="flex-1 min-h-[48px] px-4 border-2 border-govuk-border bg-white text-govuk-text font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
            aria-label="Next POI"
          >
            Next →
          </button>
        </div>
      )}
    </main>
  )
}
