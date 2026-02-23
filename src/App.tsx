import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { TrailProvider } from './context/TrailProvider'
import { SetupGate } from './components/SetupGate'
import { HomeScreen } from './screens/HomeScreen'
import { CaptureScreen } from './screens/CaptureScreen'
import { TrailScreen } from './screens/TrailScreen'
import { POIDetailScreen } from './screens/POIDetailScreen'
import { SyncScreen } from './screens/SyncScreen'
import { ExportScreen } from './screens/ExportScreen'
import { BrochureSetupScreen } from './screens/BrochureSetupScreen'

const router = createBrowserRouter([
  {
    path: '/',
    element: <SetupGate />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'capture', element: <CaptureScreen /> },
      { path: 'trail', element: <TrailScreen /> },
      { path: 'trail/poi/:poiId', element: <POIDetailScreen /> },
      { path: 'sync', element: <SyncScreen /> },
      { path: 'export', element: <ExportScreen /> },
      { path: 'brochure-setup', element: <BrochureSetupScreen /> },
    ],
  },
])

function App() {
  return (
    <TrailProvider>
      <RouterProvider router={router} />
    </TrailProvider>
  )
}

export default App
