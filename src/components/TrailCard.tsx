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
    <article className="border-2 border-govuk-border p-6 mb-6">
      <h2 className="text-xl font-bold text-govuk-text mb-2">
        {trail.displayName}
      </h2>
      <p className="text-lg text-govuk-text mb-3">
        {poiCount} of {MAX_POIS} POIs recorded — {completedCount} completed
      </p>
      <div
        className="h-2 bg-govuk-background mb-4"
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
            className="w-full min-h-[48px] px-4 py-3 bg-govuk-muted text-white font-bold opacity-60 cursor-not-allowed"
            aria-disabled="true"
          >
            Open {trail.trailType === 'graveyard' ? 'Graveyard' : 'Parish'} Trail
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3"
          aria-label={`Open ${trail.displayName}`}
        >
          Open {trail.trailType === 'graveyard' ? 'Graveyard' : 'Parish'} Trail
        </button>
      )}
    </article>
  )
}
