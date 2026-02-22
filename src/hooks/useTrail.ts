import { useContext } from 'react'
import { TrailContext } from '../context/trailContext'

export function useTrail() {
  const context = useContext(TrailContext)
  if (!context) {
    throw new Error('useTrail must be used within TrailProvider')
  }
  return context
}
