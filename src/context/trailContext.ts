import { createContext } from 'react'

export const TrailContext = createContext<{
  activeTrailId: string | null
  setActiveTrailId: (id: string) => void
} | null>(null)
