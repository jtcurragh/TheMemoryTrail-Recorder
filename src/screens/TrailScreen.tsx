import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTrail } from '../hooks/useTrail'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId, reorderPOI, deletePOI } from '../db/pois'
import type { Trail, PhotoRotation } from '../types'
import type { POIRecord } from '../types'

const MAX_POIS = 12

function ThumbnailImage({
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
  if (!src) return <div className="w-20 h-20 shrink-0 bg-govuk-background animate-pulse" />
  return (
    <img
      src={src}
      alt={alt}
      className="w-20 h-20 shrink-0 object-cover"
      style={{ transform: `rotate(${rotation}deg)` }}
    />
  )
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

  const [deletePoiId, setDeletePoiId] = useState<string | null>(null)

  const handleDeleteClick = useCallback((poiId: string) => {
    setDeletePoiId(poiId)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletePoiId) return
    try {
      await deletePOI(deletePoiId)
      setDeletePoiId(null)
      await loadTrailState()
    } catch (err) {
      console.error('Failed to delete POI:', err)
    }
  }, [deletePoiId, loadTrailState])

  const handleDeleteCancel = useCallback(() => {
    setDeletePoiId(null)
  }, [])

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <p className="text-lg text-[#0b0c0c]">
          No trail selected. Go to Parish to open a trail.
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

  const poiCount = pois.length
  const completedCount = pois.filter((p) => p.completed).length
  const progressPercent = Math.min(100, (poiCount / MAX_POIS) * 100)

  if (poiCount === 0) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-4">
          {trail.displayName}
        </h1>
        <p className="text-lg text-[#0b0c0c] mb-6">
          No POIs recorded yet — go to Capture to start
        </p>
        <button
          type="button"
          onClick={() => navigate('/capture')}
          className="min-h-[56px] px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px]"
        >
          Go to Capture
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
      <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-2">
        {trail.displayName}
      </h1>
      <p className="text-base text-[#595959] mb-3">
        {poiCount} of {MAX_POIS} POIs recorded — {completedCount} completed
      </p>
      <div className="mb-4 flex items-center gap-4 text-sm text-[#595959]">
        <div className="flex items-center gap-2">
          <span className="text-govuk-green font-bold">✓</span>
          <span>Validated</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#f59e0b] font-bold">○</span>
          <span>Needs validation</span>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex-1 h-[10px] bg-[#e0e0e0] rounded-full overflow-hidden min-w-0"
          role="progressbar"
          aria-valuenow={poiCount}
          aria-valuemin={0}
          aria-valuemax={MAX_POIS}
          aria-label={`${poiCount} of ${MAX_POIS} POIs recorded`}
        >
          <div
            className="h-full bg-[#3a9b8e] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[14px] text-[#595959] shrink-0 tabular-nums">
          {poiCount} / {MAX_POIS} POIs
        </span>
      </div>

      <ul className="space-y-3" aria-label="POIs in this trail">
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
                  className={`flex items-center gap-3 py-3 px-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-0 border-l-[5px] ${borderColor === 'border-l-govuk-green' ? 'border-l-govuk-green' : 'border-l-[#f59e0b]'} hover:border-l-[#3a9b8e] focus-within:border-l-[#3a9b8e] focus-within:ring-2 focus-within:ring-tmt-focus`}
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
                      rotation={poi.rotation ?? 0}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[#595959]">
                          {poi.sequence}.{' '}
                        </span>
                        <span
                          className={`text-sm font-bold ${statusColor}`}
                          aria-label={poi.completed ? 'Validated' : 'Needs validation'}
                        >
                          {statusIcon}
                        </span>
                      </div>
                      <span
                        className={`truncate block ${
                          poi.siteName
                            ? 'font-bold text-[#0b0c0c]'
                            : 'text-xs text-[#9ca3af] font-normal'
                        }`}
                      >
                        {poi.siteName || poi.filename}
                      </span>
                      {poi.siteName && (
                        <span className="block text-xs text-[#9ca3af] font-normal truncate">
                          {poi.filename}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1" role="toolbar" aria-label="POI actions">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteClick(poi.id)
                      }}
                      aria-label={`Delete ${poi.siteName || poi.filename}`}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-govuk-red text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-tmt-focus"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void handleReorder(poi.id, 'up')
                      }}
                      disabled={!canMoveUp}
                      aria-label="Move up"
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus rounded-lg"
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
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus rounded-lg"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
      </ul>

      {deletePoiId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleDeleteCancel}
        >
          <div
            className="bg-white p-5 max-w-md w-full rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-dialog-title" className="text-xl font-semibold text-[#1a2a2a] mb-2">
              Delete <span className="text-xs text-[#9ca3af] font-normal">{deletePoiId}</span>?
            </h2>
            <p id="delete-dialog-desc" className="text-[#0b0c0c] mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="min-h-[48px] px-6 border-2 border-[#2d7a6e] bg-white text-[#2d7a6e] font-bold rounded-[12px] hover:bg-[#f5f5f0] focus:outline-none focus:ring-2 focus:ring-tmt-focus"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                className="min-h-[48px] px-6 bg-govuk-red text-white font-bold rounded-[12px] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-tmt-focus"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
