import { useState, useCallback } from 'react'

export interface GpsState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  status: 'idle' | 'loading' | 'success' | 'error'
}

export function useGPS() {
  const [state, setState] = useState<GpsState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    status: 'idle',
  })

  const recordLocation = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'success',
        })
      },
      () => {
        setState((s) => ({ ...s, status: 'error' }))
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }, [])

  const clearPosition = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      status: 'idle',
    })
  }, [])

  return { ...state, recordLocation, clearPosition }
}
