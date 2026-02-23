import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { AppLayout } from './AppLayout'
import { HideBottomNavProvider } from '../context/HideBottomNavContext'
import { isWelcomeComplete } from '../utils/storage'

export function SetupGate() {
  const [complete, setComplete] = useState(isWelcomeComplete)
  const navigate = useNavigate()

  if (!complete) {
    return (
      <WelcomeScreen
        onComplete={() => {
          setComplete(true)
          navigate('/', { replace: true })
        }}
      />
    )
  }

  return (
    <HideBottomNavProvider>
      <AppLayout />
    </HideBottomNavProvider>
  )
}
