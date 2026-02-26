import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../db/database'
import { createTrail } from '../db/trails'
import { createPOI, getPOIById, updatePOI } from '../db/pois'
import { POIDetailScreen } from './POIDetailScreen'

const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

function TestWrapper({ initialEntry = '/trail/poi/ardmore-g-001' }: { initialEntry?: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/trail" element={<div>Trail list</div>} />
        <Route path="/trail/poi/:poiId" element={<POIDetailScreen />} />
      </Routes>
    </MemoryRouter>
  )
}

async function setupPoiWithRotation(rotation: 0 | 90 | 180 | 270) {
  await createTrail({
    groupCode: 'ardmore',
    trailType: 'graveyard',
    displayName: 'Ardmore Graveyard Trail',
  })
  const poi = await createPOI({
    trailId: 'ardmore-graveyard',
    groupCode: 'ardmore',
    trailType: 'graveyard',
    sequence: 1,
    photoBlob: mockBlob,
    thumbnailBlob: mockBlob,
    latitude: null,
    longitude: null,
    accuracy: null,
    capturedAt: '2025-02-20T12:00:00Z',
  })
  if (rotation !== 0) {
    await updatePOI(poi.id, { rotation })
  }
  return poi
}

describe('POIDetailScreen photo rotation', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('rotate button renders on the POI photo viewer', async () => {
    const poi = await setupPoiWithRotation(0)
    render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate photo clockwise/i })).toBeInTheDocument()
    })
  })

  it('each tap increments rotation by 90° (0 → 90 → 180 → 270 → 0)', async () => {
    const user = userEvent.setup()
    const poi = await setupPoiWithRotation(0)
    render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate photo clockwise/i })).toBeInTheDocument()
    })

    const rotateBtn = screen.getByRole('button', { name: /rotate photo clockwise/i })

    await user.click(rotateBtn)
    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(90deg)' })
    })

    await user.click(rotateBtn)
    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(180deg)' })
    })

    await user.click(rotateBtn)
    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(270deg)' })
    })

    await user.click(rotateBtn)
    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(0deg)' })
    })
  })

  it('rotation value is saved to Dexie on change', async () => {
    const user = userEvent.setup()
    const poi = await setupPoiWithRotation(0)
    render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate photo clockwise/i })).toBeInTheDocument()
    })

    const rotateBtn = screen.getByRole('button', { name: /rotate photo clockwise/i })
    await user.click(rotateBtn)
    await user.click(rotateBtn)

    await waitFor(async () => {
      const retrieved = await getPOIById(poi.id, { includeBlobs: false })
      expect(retrieved?.rotation).toBe(180)
    })
  })

  it('photo displays with correct CSS transform matching stored rotation', async () => {
    const poi = await setupPoiWithRotation(180)
    render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(180deg)' })
    })
  })

  it('rotation persists after navigating away and returning to POI detail', async () => {
    const user = userEvent.setup()
    const poi = await setupPoiWithRotation(0)
    const { unmount } = render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rotate photo clockwise/i })).toBeInTheDocument()
    })

    const rotateBtn = screen.getByRole('button', { name: /rotate photo clockwise/i })
    await user.click(rotateBtn)
    await user.click(rotateBtn)

    await waitFor(async () => {
      const retrieved = await getPOIById(poi.id, { includeBlobs: false })
      expect(retrieved?.rotation).toBe(180)
    })

    unmount()
    render(<TestWrapper initialEntry={`/trail/poi/${poi.id}`} />)

    await waitFor(() => {
      const img = document.querySelector('img[alt]')
      expect(img).toHaveStyle({ transform: 'rotate(180deg)' })
    })
  })
})
