import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTrail } from '../hooks/useTrail'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId, reorderPOI } from '../db/pois'
import type { Trail } from '../types'
import type { POIRecord } from '../types'

const MAX_POIS = 12

function ThumbnailImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return <div className="w-20 h-20 shrink-0 bg-govuk-background animate-pulse" />
  return <img src={src} alt={alt} className="w-20 h-20 shrink-0 object-cover" />
}

export function TrailScreen() {
  const navigate = useNavigate()
  const { activeTrailId } = useTrail()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [pois, setPois] = useState<POIRecord[]>([])

  const loadTrailState = useCallback(async () => {
    if (!activeTrailId) return
    const [t, p] = await Promise.all([
      getTrailById(activeTrailId),
      getPOIsByTrailId(activeTrailId, { includeBlobs: true }),
    ])
    setTrail(t ?? null)
    setPois(p ?? [])
  }, [activeTrailId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadTrailState()
    })
  }, [loadTrailState])

  const handleReorder = useCallback(
    async (poiId: string, direction: 'up' | 'down') => {
      if (!activeTrailId) return
      try {
        await reorderPOI(activeTrailId, poiId, direction)
        await loadTrailState()
      } catch (err) {
        console.error('Failed to reorder:', err)
      }
    },
    [activeTrailId, loadTrailState]
  )

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">
          No trail selected. Go to Parish to open a trail.
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

  const poiCount = pois.length
  const completedCount = pois.filter((p) => p.completed).length
  const progressPercent = Math.min(100, (poiCount / MAX_POIS) * 100)

  if (poiCount === 0) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">
          {trail.displayName}
        </h1>
        <p className="text-lg text-govuk-text mb-6">
          No POIs recorded yet — go to Capture to start
        </p>
        <button
          type="button"
          onClick={() => navigate('/capture')}
          className="min-h-[56px] px-6 bg-tmt-teal text-white font-bold text-lg"
        >
          Go to Capture
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-2">
        {trail.displayName}
      </h1>
      <p className="text-lg text-govuk-text mb-3">
        {poiCount} of {MAX_POIS} POIs recorded — {completedCount} completed
      </p>
      <div className="mb-4 flex items-center gap-4 text-sm text-govuk-muted">
        <div className="flex items-center gap-2">
          <span className="text-govuk-green font-bold">✓</span>
          <span>Validated</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#f59e0b] font-bold">○</span>
          <span>Needs validation</span>
        </div>
      </div>
      <div
        className="h-2 bg-govuk-background mb-6"
        role="progressbar"
        aria-valuenow={poiCount}
        aria-valuemin={0}
        aria-valuemax={MAX_POIS}
        aria-label={`${poiCount} of ${MAX_POIS} POIs recorded`}
      >
        <div
          className="h-full bg-tmt-teal transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ul className="space-y-2" aria-label="POIs in this trail">
        {[...pois]
          .sort((a, b) => a.sequence - b.sequence)
          .map((poi, idx, arr) => {
            const canMoveUp = idx > 0
            const canMoveDown = idx < arr.length - 1
            const borderColor = poi.completed
              ? 'border-l-govuk-green'
              : 'border-l-[#f59e0b]'
            const statusIcon = poi.completed ? '✓' : '○'
            const statusColor = poi.completed
              ? 'text-govuk-green'
              : 'text-[#f59e0b]'
            return (
              <li key={poi.id}>
                <div
                  className={`flex items-center gap-3 py-3 px-4 bg-white border-2 border-govuk-border border-l-4 ${borderColor} hover:border-tmt-teal focus-within:border-tmt-teal focus-within:ring-2 focus-within:ring-tmt-focus`}
                  role="group"
                >
                  <Link
                    to={`/trail/poi/${poi.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 focus:outline-none focus:ring-2 focus:ring-tmt-focus focus:ring-offset-2"
                    aria-label={`POI ${poi.sequence}: ${poi.siteName || poi.filename}${poi.completed ? ' - validated' : ' - needs validation'}`}
                  >
                    <ThumbnailImage
                      blob={poi.thumbnailBlob}
                      alt={poi.siteName || poi.filename}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-govuk-muted">
                          {poi.sequence}.{' '}
                        </span>
                        <span
                          className={`text-sm font-bold ${statusColor}`}
                          aria-label={poi.completed ? 'Validated' : 'Needs validation'}
                        >
                          {statusIcon}
                        </span>
                      </div>
                      <span className="font-bold text-govuk-text truncate block">
                        {poi.siteName || poi.filename}
                      </span>
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1" role="toolbar" aria-label="Reorder">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleReorder(poi.id, 'up')
                      }}
                      disabled={!canMoveUp}
                      aria-label="Move up"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center border-2 border-govuk-border bg-white text-govuk-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleReorder(poi.id, 'down')
                      }}
                      disabled={!canMoveDown}
                      aria-label="Move down"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center border-2 border-govuk-border bg-white text-govuk-text disabled:opacity-40 disabled:cursor-not-allowed hover:bg-govuk-background focus:outline-none focus:ring-2 focus:ring-tmt-focus"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
      </ul>
    </main>
  )
}
