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
 * All POIs: 85 words each at 13pt font
 */
const sampleStories = [
  // 85 words - Bronze Age Burnt Mound
  'This Bronze Age burnt mound dates to approximately 2000 BC and represents one of the earliest traces of human activity in this area. Archaeological surveys have identified heat-shattered stones and charcoal-rich soil indicating intensive cooking activities. The site likely functioned as a communal gathering place where water was heated using hot stones dropped into wooden troughs. Local tradition suggests this was a seasonal meeting point for extended family groups. The mound accumulated over centuries of use, creating the distinctive horseshoe shape visible today, providing invaluable insights into prehistoric daily life.',
  
  // 85 words - Medieval Parish Church
  'The medieval parish church ruins visible here date to the 13th century, though documentary evidence suggests an earlier wooden structure occupied this site. The west gable features remarkable stone carvings documented by the National Monuments Service, including fine examples of Gothic window tracery. Local historians have traced continuous use of this site for worship spanning over 800 years. The church served a large rural parish until construction of a new church in the village during the 1850s. The surrounding graveyard remains in active use and contains headstones dating from the 1600s onwards.',
  
  // 85 words - Holy Well
  'This holy well has been a place of pilgrimage since early Christian times, possibly as early as the 6th century. The stone surround dates to the late 1700s when the site was formally renovated. Pattern days were traditionally held here on the feast of the patron saint each August, attracting pilgrims from across the region who would walk barefoot around the well while reciting prayers. The water was believed to have curative properties, particularly for eye ailments. Though pattern days have ceased, the site remains a place of quiet reflection and prayer for the local community.',
  
  // 85 words - Victorian Estate Gates
  'These magnificent wrought iron gates were commissioned by the local landlord family in the 1880s during the height of Victorian prosperity. The exceptional craftsmanship displays typical Victorian attention to decorative detail, with elaborate scrollwork patterns and the family crest prominently displayed at the center. The gates were forged by a renowned Dublin ironworks firm whose work can be found at several grand estates throughout Ireland. Similar gates once stood at other estate entrances throughout the county, though few remain in such remarkably good condition, surviving as testament to the skilled craftspeople of that era.',
  
  // 85 words - Stone Bridge
  'The stone bridge crossing this stream dates to the early 1800s and formed part of the new road network established during that period of infrastructure development. Built using local limestone quarried from nearby sites, the single-arch design has proven remarkably durable despite two centuries of constant use. The bridge played a crucial role in connecting remote farming communities to the nearest market town, enabling the transport of agricultural produce and livestock. Local folklore preserves stories of dramatic events that occurred here, including accounts of floods and rescue efforts during particularly severe winters when the stream became impassable.',
  
  // 85 words - Vernacular Cottage
  'This vernacular thatched cottage represents a once-common building type that has now become increasingly rare across rural Ireland. The thick stone walls and small windows reflect practical responses to the Irish climate, providing insulation against cold winters and protection from prevailing winds. The house was continuously occupied by the same family for five generations from the 1870s until the 1970s. The interior layout follows the traditional pattern with a central hearth and sleeping areas divided by wooden partitions. Recent conservation efforts have stabilized the structure, preserving this important example of traditional rural architecture for future generations.',
  
  // 85 words - Penal Mass Rock
  'The mass rock concealed in this sheltered location served the local Catholic community during the Penal Laws era of the 1700s when public Catholic worship was forbidden by law. Mass was celebrated outdoors at hidden locations like this, with lookouts posted to warn of approaching authorities. The natural rock formation provided both an altar surface and some protection from the elements during services. Local oral tradition preserves detailed accounts of the families who risked severe penalties to attend Mass here. This site stands as a powerful reminder of a difficult period in Irish history when religious freedom was denied.',
  
  // 85 words - Lime Kiln
  'This lime kiln is one of several built across the parish in the 1800s to produce quicklime for agricultural improvement during a period of intensified farming. Limestone was burned at high temperatures for several days using turf or coal as fuel, then the resulting lime was spread on fields to reduce soil acidity and improve crop yields. The kiln required skilled operation to maintain proper temperatures throughout the burning process. The decline of this practice following the introduction of modern agricultural lime has left these distinctive industrial monuments scattered across the landscape as reminders of traditional farming methods.',
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
