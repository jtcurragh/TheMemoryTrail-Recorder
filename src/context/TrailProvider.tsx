import { useState, useCallback, type ReactNode } from 'react'
import { TrailContext } from './trailContext'
import { getActiveTrailId, setActiveTrailId as persistActiveTrailId } from '../utils/storage'

export function TrailProvider({ children }: { children: ReactNode }) {
  const [activeTrailId, setActiveTrailIdState] = useState<string | null>(
    () => getActiveTrailId()
  )

  const setActiveTrailId = useCallback((id: string) => {
    persistActiveTrailId(id)
    setActiveTrailIdState(id)
  }, [])

  return (
    <TrailContext.Provider value={{ activeTrailId, setActiveTrailId }}>
      {children}
    </TrailContext.Provider>
  )
}
