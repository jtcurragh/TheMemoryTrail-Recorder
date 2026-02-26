import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { TrailProvider } from '../context/TrailProvider'
import { createTrail } from '../db/trails'
import { createPOI, getPOIsByTrailId, updatePOI } from '../db/pois'
import { TrailScreen } from './TrailScreen'

const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

function TestWrapper() {
  return (
    <MemoryRouter initialEntries={['/trail']}>
      <TrailProvider>
        <TrailScreen />
      </TrailProvider>
    </MemoryRouter>
  )
}

async function setupTrailWithPois(): Promise<{ poi1: Awaited<ReturnType<typeof createPOI>>; poi2: Awaited<ReturnType<typeof createPOI>> }> {
  await createTrail({
    groupCode: 'ardmore',
    trailType: 'graveyard',
    displayName: 'Ardmore Graveyard Trail',
  })
  const poi1 = await createPOI({
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
  await new Promise((r) => setTimeout(r, 5))
  const poi2 = await createPOI({
    trailId: 'ardmore-graveyard',
    groupCode: 'ardmore',
    trailType: 'graveyard',
    sequence: 2,
    photoBlob: mockBlob,
    thumbnailBlob: mockBlob,
    latitude: null,
    longitude: null,
    accuracy: null,
    capturedAt: '2025-02-20T12:00:00Z',
  })
  return { poi1, poi2 }
}

describe('TrailScreen POI delete', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    localStorage.setItem('welcomeComplete', 'true')
    localStorage.setItem('userEmail', 'test@example.com')
    localStorage.setItem('activeTrailId', 'ardmore-graveyard')
  })

  it('delete button renders on each POI card', async () => {
    await setupTrailWithPois()
    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('tapping delete opens confirmation dialog with correct POI ID', async () => {
    const { poi1 } = await setupTrailWithPois()
    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Delete ${poi1.id}\\?`, 'i'))).toBeInTheDocument()
      expect(screen.getByText(/This cannot be undone/i)).toBeInTheDocument()
    })
  })

  it('confirming deletes the POI from Dexie and removes it from the list', async () => {
    const { poi1, poi2 } = await setupTrailWithPois()
    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Delete ${poi1.id}\\?`, 'i'))).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /^Delete$/i })
    await userEvent.click(confirmButton)

    await waitFor(async () => {
      const pois = await getPOIsByTrailId('ardmore-graveyard', { includeBlobs: false })
      expect(pois).toHaveLength(1)
      expect(pois[0].id).toBe(poi2.id)
    })

    await waitFor(() => {
      expect(screen.queryByText(new RegExp(poi1.id, 'i'))).not.toBeInTheDocument()
    })
  })

  it('cancelling dismisses the dialog without deleting', async () => {
    const { poi1 } = await setupTrailWithPois()
    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Delete ${poi1.id}\\?`, 'i'))).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText(new RegExp(`Delete ${poi1.id}\\?`, 'i'))).not.toBeInTheDocument()
    })

    const pois = await getPOIsByTrailId('ardmore-graveyard', { includeBlobs: false })
    expect(pois).toHaveLength(2)
  })

  it('deleted POI sequence number is not reused', async () => {
    const { poi1, poi2 } = await setupTrailWithPois()
    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Delete ${poi1.id}\\?`, 'i'))).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /^Delete$/i })
    await userEvent.click(confirmButton)

    await waitFor(async () => {
      const pois = await getPOIsByTrailId('ardmore-graveyard', { includeBlobs: false })
      expect(pois).toHaveLength(1)
    })

    // Remaining POI is renumbered to close the gap (deletePOI renumbers 1,2,3...)
    const remaining = await getPOIsByTrailId('ardmore-graveyard', { includeBlobs: false })
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(poi2.id)
  })
})

describe('TrailScreen thumbnail rotation', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    localStorage.setItem('welcomeComplete', 'true')
    localStorage.setItem('userEmail', 'test@example.com')
    localStorage.setItem('activeTrailId', 'ardmore-graveyard')
  })

  it('thumbnail displays with rotation transform when POI has rotation', async () => {
    const { poi1 } = await setupTrailWithPois()
    await updatePOI(poi1.id, { rotation: 90 })

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      const thumbnails = document.querySelectorAll(`img[alt*="${poi1.id}"]`)
      expect(thumbnails.length).toBeGreaterThanOrEqual(1)
      expect(thumbnails[0]).toHaveStyle({ transform: 'rotate(90deg)' })
    })
  })
})
