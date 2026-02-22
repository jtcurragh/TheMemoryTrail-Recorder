import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrailCard } from '../components/TrailCard'
import { getUserProfile } from '../db/userProfile'
import { getTrailsByGroupCode } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { useTrail } from '../hooks/useTrail'
import type { UserProfile } from '../types'

export function HomeScreen() {
  const navigate = useNavigate()
  const { setActiveTrailId } = useTrail()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const p = await getUserProfile()
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [])

  const [graveyardTrail, setGraveyardTrail] = useState<{
    trail: Awaited<ReturnType<typeof getTrailsByGroupCode>>[0]
    poiCount: number
    completedCount: number
  } | null>(null)
  const [parishTrail, setParishTrail] = useState<{
    trail: Awaited<ReturnType<typeof getTrailsByGroupCode>>[0]
    poiCount: number
    completedCount: number
  } | null>(null)

  useEffect(() => {
    if (!profile) return

    async function loadTrails() {
      const trails = await getTrailsByGroupCode(profile!.groupCode)
      const graveyard = trails.find((t) => t.trailType === 'graveyard')
      const parish = trails.find((t) => t.trailType === 'parish')

      if (graveyard) {
        const pois = await getPOIsByTrailId(graveyard.id, { includeBlobs: false })
        const completed = pois.filter((p) => p.completed).length
        setGraveyardTrail({ trail: graveyard, poiCount: pois.length, completedCount: completed })
      }
      if (parish) {
        const pois = await getPOIsByTrailId(parish.id, { includeBlobs: false })
        const completed = pois.filter((p) => p.completed).length
        setParishTrail({ trail: parish, poiCount: pois.length, completedCount: completed })
      }
    }

    loadTrails()
  }, [profile])

  const handleOpenTrail = (trailId: string) => {
    setActiveTrailId(trailId)
    navigate('/trail')
  }

  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-white p-6">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 max-w-[680px] mx-auto pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-6" id="home-heading">
        Welcome back, {profile.name}
      </h1>

      {graveyardTrail && (
        <TrailCard
          trail={graveyardTrail.trail}
          poiCount={graveyardTrail.poiCount}
          completedCount={graveyardTrail.completedCount}
          onOpen={() => handleOpenTrail(graveyardTrail.trail.id)}
        />
      )}
      {parishTrail && (
        <TrailCard
          trail={parishTrail.trail}
          poiCount={parishTrail.poiCount}
          completedCount={parishTrail.completedCount}
          onOpen={() => handleOpenTrail(parishTrail.trail.id)}
        />
      )}
    </main>
  )
}
