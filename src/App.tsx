import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { TrailProvider } from './context/TrailProvider'
import { SetupGate } from './components/SetupGate'
import { HomeScreen } from './screens/HomeScreen'
import { CaptureScreen } from './screens/CaptureScreen'
import { TrailScreen } from './screens/TrailScreen'
import { POIDetailScreen } from './screens/POIDetailScreen'
import { ExportScreen } from './screens/ExportScreen'

const router = createBrowserRouter([
  {
    path: '/',
    element: <SetupGate />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'capture', element: <CaptureScreen /> },
      { path: 'trail', element: <TrailScreen /> },
      { path: 'trail/poi/:poiId', element: <POIDetailScreen /> },
      { path: 'export', element: <ExportScreen /> },
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
