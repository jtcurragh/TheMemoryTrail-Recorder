import { useEffect, useState } from 'react'
import { getUserProfile } from '../db/userProfile'
import { getTrailsByGroupCode } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { db } from '../db/database'
import { exportTrailsToZip, downloadBlob } from '../utils/export'
import type { UserProfile } from '../types'

function clearAllData(): void {
  localStorage.removeItem('userSetupComplete')
  localStorage.removeItem('activeTrailId')
  void db.userProfile.clear()
  void db.trails.clear()
  void db.pois.clear()
  window.location.reload()
}

export function ExportScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [graveyardCount, setGraveyardCount] = useState(0)
  const [parishCount, setParishCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const p = await getUserProfile()
      setProfile(p)
      if (!p) return

      const trails = await getTrailsByGroupCode(p.groupCode)
      const graveyard = trails.find((t) => t.trailType === 'graveyard')
      const parish = trails.find((t) => t.trailType === 'parish')

      if (graveyard) {
        const pois = await getPOIsByTrailId(graveyard.id, { includeBlobs: false })
        setGraveyardCount(pois.length)
      }
      if (parish) {
        const pois = await getPOIsByTrailId(parish.id, { includeBlobs: false })
        setParishCount(pois.length)
      }
    }
    load()
  }, [])

  const handleExport = async () => {
    if (!profile) return
    setExporting(true)
    setExportSuccess(false)
    try {
      const hasData = graveyardCount > 0 || parishCount > 0
      if (!hasData) return

      const trails = await getTrailsByGroupCode(profile.groupCode)
      const zip = await exportTrailsToZip(trails)
      const filename = `${profile.groupCode}_memory_trail_export.zip`
      downloadBlob(zip, filename)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const totalPois = graveyardCount + parishCount
  const hasData = totalPois > 0

  if (!profile) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-4">Export</h1>

      <div className="space-y-4 mb-8">
        <p className="text-lg text-govuk-text">
          Export your trails as a ZIP file. Email it to your coordinator, then
          add your stories in Word and send them separately.
        </p>

        <div className="bg-govuk-background p-4 rounded border border-govuk-border">
          <h2 className="font-bold text-govuk-text mb-2">Summary</h2>
          <p className="text-govuk-text">
            Graveyard trail: {graveyardCount} POIs
          </p>
          <p className="text-govuk-text">
            Parish trail: {parishCount} POIs
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!hasData || exporting}
          className={`min-h-[56px] w-full px-6 border-2 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            exportSuccess
              ? 'bg-govuk-green border-govuk-green text-white'
              : 'bg-white border-govuk-border text-govuk-text'
          }`}
        >
          {exporting ? 'Creating ZIP...' : exportSuccess ? 'Export downloaded!' : 'Export (ZIP)'}
        </button>

        {exportSuccess && (
          <p className="text-govuk-green font-bold" role="status">
            Your data stays in the app for reference.
          </p>
        )}

        {!hasData && (
          <p className="text-govuk-muted">
            No POIs to export yet. Capture some photos first.
          </p>
        )}
      </div>

      <section className="mt-8 pt-8 border-t-2 border-govuk-border">
        <h2 className="text-lg font-bold text-govuk-text mb-2">
          Start new project
        </h2>
        <p className="text-govuk-text mb-4">
          Only use this when you have finished and want to clear all data to
          start a new site. Your exported ZIP and story files are separate — they
          will not be affected.
        </p>
        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="min-h-[48px] px-6 border-2 border-govuk-red text-govuk-red font-bold hover:bg-govuk-red hover:text-white"
        >
          Clear all data
        </button>
      </section>

      {showClearConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-confirm-title"
        >
          <div className="bg-white p-6 max-w-md rounded shadow-lg">
            <h2
              id="clear-confirm-title"
              className="text-xl font-bold text-govuk-text mb-4"
            >
              Clear all data?
            </h2>
            <p className="text-govuk-text mb-6">
              This will remove all trails, photos, and your profile. You will
              need to set up again. Make sure you have exported first.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 min-h-[48px] border-2 border-govuk-border font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false)
                  clearAllData()
                }}
                className="flex-1 min-h-[48px] bg-govuk-red text-white font-bold"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
