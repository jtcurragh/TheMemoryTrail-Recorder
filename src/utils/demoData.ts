import type { BrochureSetup, POIRecord } from '../types'

/**
 * Generate a placeholder image blob with text overlay
 */
export async function createPlaceholderImage(
  text: string,
  color: string,
  width = 400,
  height = 300
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)

  // Text
  ctx.fillStyle = 'white'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
  })
}

/**
 * Sample Irish heritage stories
 */
const sampleStories = [
  'This Bronze Age burnt mound dates to approximately 2000 BC and represents one of the earliest traces of human activity in this area. Archaeological surveys have identified heat-shattered stones and charcoal-rich soil indicating intensive cooking activities. Local tradition suggests this was a seasonal gathering place for extended family groups.',
  
  'The medieval parish church ruins visible here date to the 13th century, though documentary evidence suggests an earlier wooden structure on this site. The west gable features remarkable stone carvings that have been documented by the National Monuments Service. Local historians have traced continuous use of this site for worship spanning over 800 years.',
  
  'This holy well has been a place of pilgrimage since early Christian times. The stone surround dates to the late 1700s, though the well itself is much older. Pattern days were traditionally held here on the feast of the patron saint, attracting pilgrims from across the region. The water was believed to have curative properties.',
  
  'These wrought iron gates were commissioned by the local landlord family in the 1880s. The craftsmanship displays typical Victorian attention to detail with decorative scrollwork and the family crest prominently displayed. Similar gates can be found at other estate entrances throughout the county, though few remain in such good condition.',
  
  'The stone bridge crossing this stream dates to the early 1800s and formed part of the new road network established during that period. Built using local limestone, the single-arch design has proven remarkably durable. The bridge played a crucial role in connecting remote farming communities to the nearest market town.',
  
  'This vernacular thatched cottage represents a once-common building type that has now become rare. The thick stone walls and small windows reflect practical responses to the Irish climate. Oral history tells us this house was continuously occupied by the same family for five generations until the 1970s.',
  
  'The mass rock concealed in this sheltered location served the local Catholic community during the Penal Laws era of the 1700s. When public Catholic worship was forbidden, Mass was celebrated outdoors at hidden locations like this. The natural rock formation provided both an altar and some protection from the elements.',
  
  'This lime kiln is one of several built across the parish in the 1800s to produce quicklime for agricultural improvement. Limestone was burned at high temperatures for several days, then the resulting lime was spread on fields to reduce soil acidity. The decline of this practice has left these industrial monuments scattered across the landscape.',
]

/**
 * Generate demo BrochureSetup with placeholder data
 */
export async function generateDemoBrochureSetup(): Promise<BrochureSetup> {
  const coverPhoto = await createPlaceholderImage('DEMO TRAIL', '#3a9b8e', 800, 1200)
  
  const logo1 = await createPlaceholderImage('LOGO 1', '#4a5568', 200, 200)
  const logo2 = await createPlaceholderImage('LOGO 2', '#718096', 200, 200)

  return {
    id: 'demo',
    trailId: 'demo',
    coverTitle: 'Sample Heritage Trail',
    coverPhotoBlob: coverPhoto,
    groupName: 'Demo Tidy Towns 2024',
    creditsText: `This demonstration brochure has been created by The Memory Trail team to showcase the digital heritage trail format.\n\nAcknowledgements: Local historians, community volunteers, and heritage enthusiasts who contribute to preserving our shared heritage.\n\nFunding support provided by heritage councils and community development programmes.`,
    introText: 'Welcome to this demonstration heritage trail. This sample brochure showcases how communities can document and share their local heritage using The Memory Trail app. Each Point of Interest represents a significant site in the local landscape, from ancient monuments to more recent historical features. Together, these sites tell the story of human activity and settlement patterns spanning thousands of years.',
    funderLogos: [logo1, logo2],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Generate 8 demo POIs with placeholder images and stories
 */
export async function generateDemoPOIs(): Promise<POIRecord[]> {
  const colors = [
    '#3a9b8e', // teal
    '#4a5568', // grey
    '#2c5282', // blue
    '#744210', // brown
    '#276749', // green
    '#97266d', // purple
    '#975a16', // orange
    '#1a202c', // dark
  ]

  const poiNames = [
    'Bronze Age Burnt Mound',
    'Medieval Parish Church',
    'St. Brigid\'s Holy Well',
    'Victorian Estate Gates',
    'Stone Bridge',
    'Vernacular Cottage',
    'Penal Mass Rock',
    'Historic Lime Kiln',
  ]

  const pois: POIRecord[] = []

  for (let i = 0; i < 8; i++) {
    const photo = await createPlaceholderImage(
      `POI ${i + 1}`,
      colors[i],
      600,
      800
    )
    const thumbnail = await createPlaceholderImage(
      `${i + 1}`,
      colors[i],
      200,
      200
    )

    pois.push({
      id: `demo-poi-${i + 1}`,
      trailId: 'demo',
      groupCode: 'demo',
      trailType: 'graveyard',
      sequence: i + 1,
      filename: `demo-${i + 1}.jpg`,
      photoBlob: photo,
      thumbnailBlob: thumbnail,
      latitude: 52.0 + (i * 0.01), // Fake coordinates
      longitude: -7.0 - (i * 0.01),
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: poiNames[i],
      category: 'Historic Feature',
      description: '',
      story: sampleStories[i],
      url: `https://example.com/poi-${i + 1}`,
      condition: 'Good',
      notes: '',
      completed: true,
    })
  }

  return pois
}

/**
 * Generate demo trail data
 */
export function generateDemoTrail() {
  return {
    id: 'demo-trail',
    groupCode: 'demo',
    trailType: 'graveyard' as const,
    displayName: 'Demo Graveyard Trail',
    createdAt: new Date().toISOString(),
    nextSequence: 9,
  }
}
