import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getBrochureSetup, saveBrochureSetup } from '../db/brochureSetup'
import { getUserProfile } from '../db/userProfile'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { generateStaticMap } from '../utils/mapbox'
import { fixOrientation } from '../utils/thumbnail'
import type { BrochureSetup } from '../types'

function CoverPhotoPreview({ blob }: { blob: Blob }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return null
  return (
    <img
      src={src}
      alt="Cover photo preview"
      className="max-h-32 object-contain border-2 border-govuk-border"
    />
  )
}

function ImagePreview({
  blob,
  alt,
  onRemove,
}: {
  blob: Blob
  alt: string
  onRemove: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    queueMicrotask(() => setSrc(url))
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return null
  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt}
        className="w-20 h-20 object-cover border-2 border-govuk-border"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${alt}`}
        className="absolute -top-2 -right-2 w-6 h-6 bg-govuk-red text-white rounded-full flex items-center justify-center text-sm font-bold"
      >
        ×
      </button>
    </div>
  )
}

export function BrochureSetupScreen() {
  const { state, search } = useLocation() as {
    state?: { trailId?: string }
    search: string
  }
  const navigate = useNavigate()
  const trailId =
    state?.trailId ?? new URLSearchParams(search).get('trailId')

  const [trail, setTrail] = useState<{ id: string; displayName: string } | null>(null)
  const [coverTitle, setCoverTitle] = useState('')
  const [groupName, setGroupName] = useState('')
  const [coverPhotoBlob, setCoverPhotoBlob] = useState<Blob | null>(null)
  const [introText, setIntroText] = useState('')
  const [creditsText, setCreditsText] = useState('')
  const [funderLogos, setFunderLogos] = useState<Blob[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [trailNotFound, setTrailNotFound] = useState(false)

  const loadData = useCallback(async () => {
    if (!trailId) return
    setTrailNotFound(false)
    const [t, setup, profile] = await Promise.all([
      getTrailById(trailId),
      getBrochureSetup(trailId),
      getUserProfile(),
    ])
    if (t) {
      setTrail({ id: t.id, displayName: t.displayName })
    } else {
      setTrailNotFound(true)
    }
    if (profile) setGroupName(profile.groupName)
    if (setup) {
      setCoverTitle(setup.coverTitle)
      setGroupName(setup.groupName)
      setCoverPhotoBlob(setup.coverPhotoBlob)
      setIntroText(setup.introText)
      setCreditsText(setup.creditsText)
      setFunderLogos(setup.funderLogos)
    }
  }, [trailId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file?.type.startsWith('image/')) {
      try {
        console.log('[CoverPhoto] Processing image orientation...')
        const fixed = await fixOrientation(file)
        console.log('[CoverPhoto] Orientation fixed, size:', fixed.size)
        setCoverPhotoBlob(fixed)
      } catch (err) {
        console.error('[CoverPhoto] Failed to process image:', err)
        setCoverPhotoBlob(file)
      }
    }
    e.target.value = ''
  }

  const handleFunderLogosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith('image/')
    )
    setFunderLogos((prev) => [...prev, ...files].slice(0, 6))
    e.target.value = ''
  }

  const removeFunderLogo = (idx: number) => {
    setFunderLogos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trailId || !trail) return
    const newErrors: Record<string, string> = {}
    if (!coverTitle.trim()) newErrors.coverTitle = 'Cover title is required'
    if (!groupName.trim()) newErrors.groupName = 'Community group name is required'
    if (!introText.trim()) newErrors.introText = 'Introduction is required'
    // Cover photo is now optional
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSaving(true)
    try {
      // Fetch POIs and generate map
      const pois = await getPOIsByTrailId(trailId, { includeBlobs: false })
      console.log('[BrochureSetup] Found POIs:', pois.length)
      const mapBlob = await generateStaticMap(pois)
      console.log('[BrochureSetup] Generated map blob:', mapBlob ? `${mapBlob.size} bytes` : 'null')
      
      const setup: BrochureSetup = {
        id: trailId,
        trailId,
        coverTitle: coverTitle.trim(),
        coverPhotoBlob,
        groupName: groupName.trim(),
        creditsText: creditsText.trim(),
        introText: introText.trim(),
        funderLogos,
        mapBlob,
        updatedAt: new Date().toISOString(),
      }
      await saveBrochureSetup(setup)
      console.log('[BrochureSetup] Saved brochure setup with map blob')
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        navigate('/export')
      }, 1000)
    } catch (err) {
      console.error('Save failed:', err)
      setErrors({ submit: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (!trailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">
          No trail selected. Go to Export and choose a trail first.
        </p>
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="mt-4 min-h-[48px] px-6 bg-tmt-teal text-white font-bold"
        >
          Back to Export
        </button>
      </main>
    )
  }

  if (!trail && !trailNotFound) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  if (trailNotFound) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Trail not found.</p>
        <button
          type="button"
          onClick={() => navigate('/export')}
          className="mt-4 min-h-[48px] px-6 bg-tmt-teal text-white font-bold"
        >
          Back to Export
        </button>
      </main>
    )
  }

  if (!trail) return null

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/export')}
        className="mb-4 flex items-center gap-2 text-tmt-teal font-bold text-lg"
        aria-label="Back to Export"
      >
        ← Back to Export
      </button>

      <h1 className="text-2xl font-bold text-govuk-text mb-4" id="brochure-setup-heading">
        Brochure Setup
      </h1>

      <div
        className="mb-6 pl-4 border-l-4 border-tmt-teal bg-govuk-background py-3 pr-4"
        role="region"
        aria-label="Notice"
      >
        <p className="text-govuk-text">
          This information will appear on the cover and credits pages of your
          digital brochure. You can update it at any time.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <label
            htmlFor="coverTitle"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Cover Title <span className="text-govuk-red">*</span>
          </label>
          {errors.coverTitle && (
            <p
              id="coverTitle-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.coverTitle}
            </p>
          )}
          <input
            id="coverTitle"
            type="text"
            value={coverTitle}
            onChange={(e) => setCoverTitle(e.target.value)}
            placeholder="e.g. Clonfert Trails Heritage Trail"
            aria-required
            aria-invalid={!!errors.coverTitle}
            aria-describedby={errors.coverTitle ? 'coverTitle-error' : undefined}
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
          />
        </div>

        <div>
          <label
            htmlFor="groupName"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Community Group Name <span className="text-govuk-red">*</span>
          </label>
          {errors.groupName && (
            <p
              id="groupName-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.groupName}
            </p>
          )}
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Clonfert Tidy Towns"
            aria-required
            aria-invalid={!!errors.groupName}
            aria-describedby={errors.groupName ? 'groupName-error' : undefined}
            className="block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
          />
        </div>

        <div>
          <label className="block text-lg font-bold text-govuk-text mb-2">
            Cover Photo (optional)
          </label>
          <p className="text-sm text-govuk-muted mb-2">
            Upload a photo or leave blank for text-only cover
          </p>
          {errors.coverPhoto && (
            <p className="text-govuk-red font-bold mb-2" role="alert">
              {errors.coverPhoto}
            </p>
          )}
          <input
            id="coverPhoto"
            type="file"
            accept="image/*"
            onChange={handleCoverPhotoChange}
            aria-label="Upload cover photo"
            className="block w-full min-h-[48px] file:min-h-[48px] file:px-4 file:py-3 file:border-2 file:border-govuk-border file:bg-white file:font-bold file:text-govuk-text file:cursor-pointer"
          />
          {coverPhotoBlob && (
            <div className="mt-2">
              <CoverPhotoPreview blob={coverPhotoBlob} />
              <button
                type="button"
                onClick={() => setCoverPhotoBlob(null)}
                className="mt-1 text-govuk-red font-bold text-sm"
              >
                Remove cover photo
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="introText"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Introduction <span className="text-govuk-red">*</span>
          </label>
          {errors.introText && (
            <p
              id="introText-error"
              className="text-govuk-red font-bold mb-2"
              role="alert"
            >
              {errors.introText}
            </p>
          )}
          <textarea
            id="introText"
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            rows={5}
            placeholder="3–5 sentences about the trail and community"
            aria-required
            aria-invalid={!!errors.introText}
            aria-describedby={errors.introText ? 'introText-error' : undefined}
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
        </div>

        <div>
          <label
            htmlFor="creditsText"
            className="block text-lg font-bold text-govuk-text mb-2"
          >
            Credits &amp; Acknowledgements
          </label>
          <textarea
            id="creditsText"
            value={creditsText}
            onChange={(e) => setCreditsText(e.target.value)}
            rows={4}
            placeholder="Who wrote the content, local historians, researchers acknowledged"
            className="block w-full px-4 py-3 text-lg border-2 border-govuk-border rounded-none resize-y"
          />
        </div>

        <div>
          <label className="block text-lg font-bold text-govuk-text mb-2">
            Funder Logos (up to 6)
          </label>
          <input
            id="funderLogos"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFunderLogosChange}
            disabled={funderLogos.length >= 6}
            aria-label="Upload funder logos"
            className="block w-full min-h-[48px] file:min-h-[48px] file:px-4 file:py-3 file:border-2 file:border-govuk-border file:bg-white file:font-bold file:text-govuk-text file:cursor-pointer disabled:opacity-50"
          />
          {funderLogos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {funderLogos.map((blob, idx) => (
                <ImagePreview
                  key={idx}
                  blob={blob}
                  alt={`Funder logo ${idx + 1}`}
                  onRemove={() => removeFunderLogo(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {errors.submit && (
          <p className="text-govuk-red font-bold" role="alert">
            {errors.submit}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[56px] w-full px-6 bg-tmt-teal text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : saved ? 'Brochure setup saved' : 'Save Brochure Setup'}
        </button>
      </form>
    </main>
  )
}
