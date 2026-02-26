import type { Trail } from '../types'

interface TrailCardProps {
  trail: Trail
  poiCount: number
  completedCount: number
  onOpen: () => void
}

const MAX_POIS = 12

export function TrailCard({
  trail,
  poiCount,
  completedCount,
  onOpen,
}: TrailCardProps) {
  const isFull = poiCount >= MAX_POIS
  const progressPercent = Math.min(100, (poiCount / MAX_POIS) * 100)

  return (
    <article
      className="bg-white rounded-xl p-5 mb-6 border-l-[3px] border-l-[#3a9b8e] shadow-[0_2px_8px_rgba(0,0,0,0.10)]"
    >
      <h2 className="text-[20px] font-bold text-[#1a2a2a] mb-2">
        {trail.displayName}
      </h2>
      <p className="text-base text-[#595959] mb-3">
        {poiCount} of {MAX_POIS} POIs recorded — {completedCount} completed
      </p>
      <div
        className="h-[10px] bg-[#e0e0e0] rounded-full mb-4 overflow-hidden"
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
      {isFull ? (
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-govuk-green text-white text-sm font-bold">
            Trail complete
          </span>
          <p className="text-govuk-text">
            This trail has reached its 12 POI limit.
          </p>
          <button
            type="button"
            disabled
            className="w-full min-h-[48px] px-4 py-3 bg-govuk-muted text-white font-bold opacity-60 cursor-not-allowed rounded-lg"
            aria-disabled="true"
          >
            Open {trail.trailType === 'graveyard' ? 'Graveyard' : 'Parish'} Trail
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full min-h-[56px] bg-[#2d7a6e] text-white text-lg font-bold px-4 py-3 rounded-lg"
          aria-label={`Open ${trail.displayName}`}
        >
          Open {trail.trailType === 'graveyard' ? 'Graveyard' : 'Parish'} Trail
        </button>
      )}
    </article>
  )
}
