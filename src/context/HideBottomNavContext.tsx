/* eslint-disable react-refresh/only-export-components -- Context and Provider are co-located by design */
import { createContext, useState, type ReactNode } from 'react'

type HideBottomNavContextValue = {
  hide: boolean
  setHide: (hide: boolean) => void
}

export const HideBottomNavContext =
  createContext<HideBottomNavContextValue | null>(null)

export function HideBottomNavProvider({ children }: { children: ReactNode }) {
  const [hide, setHide] = useState(false)
  const value = { hide, setHide }
  return (
    <HideBottomNavContext.Provider value={value}>
      {children}
    </HideBottomNavContext.Provider>
  )
}
