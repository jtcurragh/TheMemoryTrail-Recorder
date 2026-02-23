import { useState, useEffect, useCallback } from 'react'
import { runSync } from '../services/syncService'
import {
  getPendingSyncCount,
  getLastSyncedAt,
  getSyncedStats,
} from '../db/syncQueue'

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncedStats, setSyncedStats] = useState<{
    poiCount: number
    trailCount: number
  }>({ poiCount: 0, trailCount: 0 })

  const refreshState = useCallback(async () => {
    const [count, last, stats] = await Promise.all([
      getPendingSyncCount(),
      getLastSyncedAt(),
      getSyncedStats(),
    ])
    setPendingCount(count)
    setLastSyncedAt(last)
    setSyncedStats(stats)
  }, [])

  const triggerManualSync = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      const result = await runSync()
      setSyncError(result.error)
      await refreshState()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, refreshState])

  useEffect(() => {
    refreshState()
    const interval = setInterval(refreshState, 5000)
    return () => clearInterval(interval)
  }, [refreshState])

  useEffect(() => {
    const handleOnline = () => {
      void triggerManualSync()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [triggerManualSync])

  return {
    isSyncing,
    lastSyncedAt,
    pendingCount,
    syncError,
    syncedStats,
    triggerManualSync,
    refreshState,
  }
}
