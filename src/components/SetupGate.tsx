import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserSetupScreen } from '../screens/UserSetupScreen'
import { AppLayout } from './AppLayout'
import { HideBottomNavProvider } from '../context/HideBottomNavContext'
import { isUserSetupComplete } from '../utils/storage'

export function SetupGate() {
  const [setupComplete, setSetupComplete] = useState(isUserSetupComplete)
  const navigate = useNavigate()

  if (!setupComplete) {
    return (
      <UserSetupScreen
        onCreateComplete={() => {
          setSetupComplete(true)
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
