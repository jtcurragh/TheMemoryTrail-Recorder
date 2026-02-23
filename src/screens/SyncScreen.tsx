import { useSync } from '../hooks/useSync'
import { formatSyncDate } from '../utils/formatSyncDate'
import { features } from '../config/features'
import { supabase } from '../lib/supabase'

export function SyncScreen() {
  const {
    isSyncing,
    lastSyncedAt,
    pendingCount,
    syncError,
    syncedStats,
    triggerManualSync,
  } = useSync()

  if (!features.SUPABASE_SYNC_ENABLED || !supabase) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">Sync</h1>
        <p className="text-lg text-govuk-muted">
          Cloud sync is not configured. Your work is saved on this device.
        </p>
      </main>
    )
  }

  const isGreen = !syncError && pendingCount === 0 && lastSyncedAt
  const isAmber = !syncError && pendingCount > 0
  const isRed = !!syncError

  return (
    <main className="min-h-screen bg-white p-6 pb-24 max-w-[680px] mx-auto">
      <h1 className="text-2xl font-bold text-govuk-text mb-8">Sync</h1>

      {isSyncing && (
        <div className="mb-6 flex items-center gap-3 text-govuk-muted" role="status">
          <span
            className="inline-block w-5 h-5 border-2 border-tmt-teal border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
          <span>Saving your work…</span>
        </div>
      )}

      {isGreen && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-6 bg-govuk-green/10 border-2 border-govuk-green rounded"
            role="status"
          >
            <span
              className="text-3xl font-bold text-govuk-green"
              aria-hidden
            >
              ✓
            </span>
            <div>
              <p className="text-xl font-bold text-govuk-green">
                Your work is safe
              </p>
              <p className="text-lg text-govuk-text mt-2">
                Last saved: {formatSyncDate(lastSyncedAt!)}
              </p>
              <p className="text-govuk-muted mt-1">
                Items saved: {syncedStats.poiCount} POI
                {syncedStats.poiCount !== 1 ? 's' : ''} across{' '}
                {syncedStats.trailCount} trail
                {syncedStats.trailCount !== 1 ? 's' : ''}
              </p>
              <p className="text-govuk-muted">Waiting: 0 items</p>
            </div>
          </div>
        </div>
      )}

      {isAmber && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-6 bg-amber-50 border-2 border-amber-500 rounded"
            role="status"
          >
            <span
              className="text-2xl font-bold text-amber-700"
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-xl font-bold text-amber-800">
                Saving when WiFi available
              </p>
              <p className="text-lg text-govuk-text mt-2">
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} waiting to
                save
              </p>
              <p className="text-govuk-muted text-sm mt-4">
                Your work is saved on this device. It will save automatically
                when you connect to WiFi.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRed && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-6 bg-govuk-red/10 border-2 border-govuk-red rounded"
            role="alert"
          >
            <span
              className="text-2xl font-bold text-govuk-red"
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-xl font-bold text-govuk-red">
                Sync problem
              </p>
              {lastSyncedAt && (
                <p className="text-lg text-govuk-text mt-2">
                  Last successful save: {formatSyncDate(lastSyncedAt)}
                </p>
              )}
              <p className="text-govuk-text mt-1">
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} waiting
              </p>
              <p className="text-govuk-muted text-sm mt-4">
                Don&apos;t worry — your work is safe on this device. Try again
                when you have a good connection, or contact your area editor.
              </p>
              <button
                type="button"
                onClick={() => void triggerManualSync()}
                disabled={isSyncing}
                className="mt-4 min-h-[48px] px-6 border-2 border-tmt-teal text-tmt-teal font-bold disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {!isGreen && !isAmber && !isRed && (
        <div className="p-6 bg-govuk-background border border-govuk-border rounded">
          <p className="text-lg text-govuk-text">
            Your work will save automatically when you connect to WiFi.
          </p>
          <p className="text-govuk-muted text-sm mt-2">
            Nothing to save yet. Start recording to see your progress here.
          </p>
        </div>
      )}
    </main>
  )
}
