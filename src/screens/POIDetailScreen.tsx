import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPOIById } from '../db/pois'
import type { POIRecord } from '../types'

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

  useEffect(() => {
    if (!poiId) return
    getPOIById(poiId, { includeBlobs: true }).then((p) => setPoi(p ?? null))
  }, [poiId])

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

      <PhotoImage blob={poi.photoBlob} alt={poi.siteName || poi.filename} />

      <div className="mt-4 space-y-3">
        <div>
          <span className="text-govuk-muted text-sm font-bold">Sequence</span>
          <p className="text-lg">{poi.sequence}</p>
        </div>
        <div>
          <span className="text-govuk-muted text-sm font-bold">Filename</span>
          <p className="text-lg font-mono break-all">{poi.filename}</p>
        </div>
        {hasGps && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">GPS</span>
            <p className="text-lg">
              {formatGps(poi.latitude!, poi.longitude!, poi.accuracy)}
            </p>
          </div>
        )}
        {poi.siteName && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">Site name</span>
            <p className="text-lg">{poi.siteName}</p>
          </div>
        )}
        {poi.category && poi.category !== 'Other' && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">Category</span>
            <p className="text-lg">{poi.category}</p>
          </div>
        )}
        {poi.description && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">
              Description
            </span>
            <p className="text-lg">{poi.description}</p>
          </div>
        )}
        {poi.story && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">Story</span>
            <p className="text-lg whitespace-pre-wrap">{poi.story}</p>
          </div>
        )}
        {poi.notes && (
          <div>
            <span className="text-govuk-muted text-sm font-bold">Notes</span>
            <p className="text-lg whitespace-pre-wrap">{poi.notes}</p>
          </div>
        )}
      </div>

      <p className="mt-6 text-govuk-muted text-sm">
        Use this screen as reference when writing your story in Word.
      </p>
    </main>
  )
}
