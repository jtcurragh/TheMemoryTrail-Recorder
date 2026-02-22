import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile } from '../db/userProfile'
import { getTrailsByGroupCode } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { getBrochureSetup } from '../db/brochureSetup'
import { db } from '../db/database'
import { exportTrailsToZip, downloadBlob } from '../utils/export'
import { generateBrochurePdf } from '../utils/pdfExport'
import { generateDemoBrochureSetup, generateDemoPOIs, generateDemoTrail } from '../utils/demoData'
import type { UserProfile, Trail } from '../types'

function clearAllData(): void {
  localStorage.removeItem('userSetupComplete')
  localStorage.removeItem('activeTrailId')
  void db.userProfile.clear()
  void db.trails.clear()
  void db.pois.clear()
  void db.brochureSetup.clear()
  window.location.reload()
}

export function ExportScreen() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [graveyardTrail, setGraveyardTrail] = useState<Trail | null>(null)
  const [parishTrail, setParishTrail] = useState<Trail | null>(null)
  const [graveyardCount, setGraveyardCount] = useState(0)
  const [parishCount, setParishCount] = useState(0)
  const [brochureTrailId, setBrochureTrailId] = useState<string | null>(null)
  const [brochureSetupComplete, setBrochureSetupComplete] = useState(false)
  const [validatedPoiCount, setValidatedPoiCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [demoGenerating, setDemoGenerating] = useState(false)

  useEffect(() => {
    async function load() {
      const p = await getUserProfile()
      setProfile(p)
      if (!p) return

      const trails = await getTrailsByGroupCode(p.groupCode)
      const graveyard = trails.find((t) => t.trailType === 'graveyard')
      const parish = trails.find((t) => t.trailType === 'parish')

      setGraveyardTrail(graveyard ?? null)
      setParishTrail(parish ?? null)
      setBrochureTrailId((prev) => prev ?? graveyard?.id ?? parish?.id ?? null)

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

  useEffect(() => {
    if (!brochureTrailId) return
    async function loadBrochureState() {
      const [setup, pois] = await Promise.all([
        getBrochureSetup(brochureTrailId!),
        getPOIsByTrailId(brochureTrailId!, { includeBlobs: false }),
      ])
      setBrochureSetupComplete(
        !!(
          setup &&
          setup.coverTitle &&
          setup.groupName &&
          setup.introText &&
          setup.coverPhotoBlob
        )
      )
      setValidatedPoiCount(pois.filter((p) => p.completed).length)
    }
    loadBrochureState()
  }, [brochureTrailId])

  const handleGeneratePdf = async () => {
    if (!brochureTrailId || !brochureSetupComplete || validatedPoiCount < 8) return
    const trail = brochureTrailId === graveyardTrail?.id ? graveyardTrail : parishTrail
    if (!trail) return
    setPdfGenerating(true)
    setPdfError(null)
    setPdfSuccess(false)
    try {
      const [setup, pois] = await Promise.all([
        getBrochureSetup(brochureTrailId),
        getPOIsByTrailId(brochureTrailId, { includeBlobs: true }),
      ])
      if (!setup) throw new Error('Brochure setup not found')
      const pdf = await generateBrochurePdf(trail, setup, pois)
      const filename = `${trail.groupCode}-${trail.trailType}-digital-brochure.pdf`
      downloadBlob(pdf, filename)
      setPdfSuccess(true)
      setTimeout(() => setPdfSuccess(false), 3000)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setPdfError(
        'PDF generation failed — please try again. If the problem persists, use the ZIP export instead.'
      )
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleGenerateDemoPdf = async () => {
    setDemoGenerating(true)
    setPdfError(null)
    try {
      const [demoSetup, demoPois, demoTrail] = await Promise.all([
        generateDemoBrochureSetup(),
        generateDemoPOIs(),
        Promise.resolve(generateDemoTrail()),
      ])
      const pdf = await generateBrochurePdf(demoTrail, demoSetup, demoPois)
      downloadBlob(pdf, 'demo-heritage-trail.pdf')
    } catch (err) {
      console.error('Demo PDF generation failed:', err)
      setPdfError('Demo PDF generation failed — please try again.')
    } finally {
      setDemoGenerating(false)
    }
  }

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
          className={`min-h-[56px] w-full px-6 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            exportSuccess
              ? 'bg-govuk-green text-white'
              : 'bg-tmt-teal text-white'
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
        <h2 className="text-lg font-bold text-govuk-text mb-4">
          Digital Brochure
        </h2>
        {brochureTrailId && (graveyardTrail || parishTrail) && (
          <>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setBrochureTrailId(graveyardTrail?.id ?? null)}
                aria-pressed={brochureTrailId === graveyardTrail?.id}
                className={`min-h-[48px] px-4 font-bold border-2 ${
                  brochureTrailId === graveyardTrail?.id
                    ? 'bg-tmt-teal border-tmt-teal text-white'
                    : 'bg-white border-govuk-border text-govuk-text'
                }`}
              >
                Graveyard Trail
              </button>
              <button
                type="button"
                onClick={() => setBrochureTrailId(parishTrail?.id ?? null)}
                aria-pressed={brochureTrailId === parishTrail?.id}
                className={`min-h-[48px] px-4 font-bold border-2 ${
                  brochureTrailId === parishTrail?.id
                    ? 'bg-tmt-teal border-tmt-teal text-white'
                    : 'bg-white border-govuk-border text-govuk-text'
                }`}
              >
                Parish Trail
              </button>
            </div>
            {!brochureSetupComplete ? (
              <div
                className="mb-4 pl-4 border-l-4 border-tmt-teal bg-govuk-background py-3 pr-4"
                role="region"
              >
                <p className="text-govuk-text mb-3">
                  Brochure setup required before you can generate a PDF.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/brochure-setup', { state: { trailId: brochureTrailId } })
                  }
                  className="min-h-[48px] px-6 bg-tmt-teal text-white font-bold"
                >
                  Set Up Brochure
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="text-govuk-green font-bold"
                  aria-label="Brochure setup complete"
                >
                  ✓ Brochure setup complete
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/brochure-setup', { state: { trailId: brochureTrailId } })
                  }
                  className="text-tmt-teal font-bold underline"
                >
                  Edit Setup
                </button>
              </div>
            )}
            <p
              className={`mb-4 font-bold ${
                validatedPoiCount >= 8 ? 'text-govuk-green' : 'text-[#b45309]'
              }`}
            >
              {validatedPoiCount >= 8
                ? `${validatedPoiCount} of 12 POIs validated — ready to generate brochure`
                : `${validatedPoiCount} of 12 POIs validated — 8 required to generate brochure`}
            </p>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={
                !brochureSetupComplete ||
                validatedPoiCount < 8 ||
                pdfGenerating
              }
              aria-label={
                !brochureSetupComplete || validatedPoiCount < 8
                  ? 'Complete brochure setup and validate at least 8 POIs to enable'
                  : 'Generate digital brochure PDF'
              }
              className="min-h-[56px] w-full px-6 bg-tmt-teal text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfGenerating
                ? 'Generating PDF...'
                : pdfSuccess
                  ? 'PDF downloaded successfully'
                  : 'Generate Digital Brochure (PDF)'}
            </button>
            {pdfGenerating && (
              <p className="mt-2 text-govuk-muted" role="status" aria-live="polite">
                Generating PDF...
              </p>
            )}
            {pdfError && (
              <p className="mt-2 text-govuk-red font-bold" role="alert">
                {pdfError}
              </p>
            )}
            {(!brochureSetupComplete || validatedPoiCount < 8) && (
              <p className="mt-2 text-govuk-muted text-sm">
                Complete brochure setup and validate at least 8 POIs to enable
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-8 pt-8 border-t-2 border-govuk-border">
        <h2 className="text-lg font-bold text-govuk-text mb-4">
          Preview Demo Brochure
        </h2>
        <p className="text-govuk-text mb-4">
          Generate a sample 12-page brochure with placeholder content to preview
          the layout and design. Includes cover page, credits, intro, 8 POI pages,
          and map page.
        </p>
        <button
          type="button"
          onClick={handleGenerateDemoPdf}
          disabled={demoGenerating}
          className="min-h-[56px] w-full px-6 border-2 border-tmt-teal bg-white text-tmt-teal font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-govuk-background"
        >
          {demoGenerating ? 'Generating Demo...' : '📄 Generate Demo Brochure'}
        </button>
        <p className="mt-2 text-govuk-muted text-sm text-center">
          No data required — uses sample Irish heritage content
        </p>
      </section>

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
