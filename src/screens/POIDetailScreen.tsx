import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPOIById, updatePOI } from '../db/pois'
import type { POIRecord, POICategory } from '../types'

function PhotoImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return <div className="w-full aspect-[4/3] bg-govuk-background animate-pulse" />
  return (
    <img
      src={src}
      alt={alt}
      className="w-full aspect-[4/3] object-contain bg-govuk-background"
    />
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
  const [siteName, setSiteName] = useState('')
  const [category, setCategory] = useState<POICategory>('Other')
  const [description, setDescription] = useState('')
  const [story, setStory] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!poiId) return
    getPOIById(poiId, { includeBlobs: true }).then((p) => setPoi(p ?? null))
  }, [poiId])

  useEffect(() => {
    if (poi) {
      setSiteName(poi.siteName)
      setCategory(poi.category)
      setDescription(poi.description)
      setStory(poi.story)
      setNotes(poi.notes)
    }
  }, [poi])

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

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updatePOI(poi.id, {
        siteName,
        category,
        description,
        story,
        notes,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

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

      <PhotoImage blob={poi.photoBlob} alt={siteName || poi.filename} />

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
            Site name (title)
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
            htmlFor="category"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as POICategory)}
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Brief description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences about this place"
            rows={3}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
        </div>

        <div>
          <label
            htmlFor="story"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Story (100–200 words)
          </label>
          <textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Add your longer story here. Or write it in Word and add it when you export."
            rows={8}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
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
            placeholder="Any other observations"
            rows={2}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`min-h-[56px] w-full border-2 font-bold text-lg disabled:opacity-50 ${
            saved
              ? 'bg-govuk-green border-govuk-green text-white'
              : 'bg-white border-govuk-border text-govuk-text'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </form>

      <p className="mt-4 text-govuk-muted text-sm">
        You can also write your story in Word and add it when you export.
      </p>
    </main>
  )
}
