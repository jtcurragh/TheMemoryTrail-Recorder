import { useContext } from 'react'
import { HideBottomNavContext } from '../context/HideBottomNavContext'

export function useHideBottomNav() {
  const ctx = useContext(HideBottomNavContext)
  return ctx ?? { hide: false, setHide: () => {} }
}
