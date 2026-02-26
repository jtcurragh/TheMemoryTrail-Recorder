export const PARISH_CATEGORIES = [
  // Structures & Buildings
  { group: 'Structures & Buildings', value: 'vernacular_building', label: 'Vernacular Building' },
  { group: 'Structures & Buildings', value: 'cottage', label: 'Cottage' },
  { group: 'Structures & Buildings', value: 'farmhouse', label: 'Farmhouse' },
  { group: 'Structures & Buildings', value: 'shed', label: 'Shed' },
  { group: 'Structures & Buildings', value: 'barn', label: 'Barn' },
  { group: 'Structures & Buildings', value: 'piggery', label: 'Piggery' },
  { group: 'Structures & Buildings', value: 'forge', label: 'Forge / Blacksmith' },
  { group: 'Structures & Buildings', value: 'old_school', label: 'Old School' },
  { group: 'Structures & Buildings', value: 'mill', label: 'Mill' },
  { group: 'Structures & Buildings', value: 'creamery_stand', label: 'Creamery Stand' },

  // Religious & Memorial
  { group: 'Religious & Memorial', value: 'holy_well', label: 'Holy Well' },
  { group: 'Religious & Memorial', value: 'grotto', label: 'Grotto' },
  { group: 'Religious & Memorial', value: 'wayside_cross', label: 'Wayside Cross / High Cross' },
  { group: 'Religious & Memorial', value: 'mass_rock', label: 'Mass Rock' },
  { group: 'Religious & Memorial', value: 'mass_path', label: 'Mass Path' },
  { group: 'Religious & Memorial', value: 'fairy_tree', label: 'Fairy Tree' },
  { group: 'Religious & Memorial', value: 'monument_memorial', label: 'Monument / Memorial' },
  { group: 'Religious & Memorial', value: 'famine_site', label: 'Famine Site' },

  // Conflict & History
  { group: 'Conflict & History', value: 'ambush_site', label: 'Ambush Site' },
  { group: 'Conflict & History', value: 'battle_site', label: 'Battle Site' },
  { group: 'Conflict & History', value: 'historic_feature', label: 'Historic Feature' },

  // Water Features
  { group: 'Water Features', value: 'stream', label: 'Stream' },
  { group: 'Water Features', value: 'sruthan', label: 'Sruthán' },
  { group: 'Water Features', value: 'river', label: 'River' },
  { group: 'Water Features', value: 'stone_bridge', label: 'Stone Bridge' },
  { group: 'Water Features', value: 'iron_bridge', label: 'Iron Bridge' },
  { group: 'Water Features', value: 'timber_bridge', label: 'Timber Bridge' },

  // Gates & Boundaries
  { group: 'Gates & Boundaries', value: 'wrought_iron_gate', label: 'Wrought Iron Gate' },
  { group: 'Gates & Boundaries', value: 'timber_gate', label: 'Timber Gate' },
  { group: 'Gates & Boundaries', value: 'gate_piers', label: 'Gate Piers' },
  { group: 'Gates & Boundaries', value: 'boundary_stone', label: 'Boundary Stone' },
  { group: 'Gates & Boundaries', value: 'boreen', label: 'Boreen' },

  // Archaeology
  { group: 'Archaeology', value: 'ringfort', label: 'Ringfort / Rath' },
  { group: 'Archaeology', value: 'standing_stone', label: 'Standing Stone' },
  { group: 'Archaeology', value: 'souterrain', label: 'Souterrain' },
  { group: 'Archaeology', value: 'earthwork', label: 'Earthwork' },
  { group: 'Archaeology', value: 'bullaun_stone', label: 'Bullaun Stone' },
  { group: 'Archaeology', value: 'burnt_mound', label: 'Burnt Mound' },
  { group: 'Archaeology', value: 'tower_house', label: 'Tower House' },
  { group: 'Archaeology', value: 'barrow', label: 'Barrow' },
  { group: 'Archaeology', value: 'burial_mound', label: 'Burial Mound' },

  // Burial Grounds
  { group: 'Burial Grounds', value: 'historic_graveyard', label: 'Historic Graveyard' },
  { group: 'Burial Grounds', value: 'cemetery', label: 'Cemetery' },
  { group: 'Burial Grounds', value: 'private_burial_ground', label: 'Private Burial Ground' },
  { group: 'Burial Grounds', value: 'cillin', label: 'Cillín' },
  { group: 'Burial Grounds', value: 'grave', label: 'Grave' },

  // Street Furniture
  { group: 'Street Furniture', value: 'post_box', label: 'Post Box' },
  { group: 'Street Furniture', value: 'phone_box', label: 'Phone Box' },
  { group: 'Street Furniture', value: 'petrol_pump', label: 'Petrol Pump' },
  { group: 'Street Furniture', value: 'water_pump', label: 'Water Pump' },

  // Natural
  { group: 'Natural', value: 'natural_feature', label: 'Natural Feature' },
  { group: 'Natural', value: 'lime_kiln', label: 'Lime Kiln' },

  // Placenames
  { group: 'Placenames', value: 'placename', label: 'Placename' },

  // Other
  { group: 'Other', value: 'other', label: 'Other' },
] as const

export type ParishCategoryValue = (typeof PARISH_CATEGORIES)[number]['value']
export type ParishCategoryLabel = (typeof PARISH_CATEGORIES)[number]['label']

export const GRAVEYARD_CATEGORIES = [
  // Grave & Burial
  { group: 'Grave & Burial', value: 'gravestone', label: 'Gravestone' },
  { group: 'Grave & Burial', value: 'vaulted_tomb', label: 'Vaulted Tomb' },
  { group: 'Grave & Burial', value: 'mausoleum', label: 'Mausoleum' },
  { group: 'Grave & Burial', value: 'family_vault', label: 'Family Vault' },
  { group: 'Grave & Burial', value: 'grave_marker', label: 'Grave Marker' },
  { group: 'Grave & Burial', value: 'unmarked_grave', label: 'Unmarked Grave' },

  // Monuments & Memorials
  { group: 'Monuments & Memorials', value: 'high_cross', label: 'High Cross' },
  { group: 'Monuments & Memorials', value: 'medieval_high_cross', label: 'Medieval High Cross' },
  { group: 'Monuments & Memorials', value: 'medieval_grave_slab', label: 'Medieval Grave Slab' },
  { group: 'Monuments & Memorials', value: 'timber_cross', label: 'Timber Cross' },
  { group: 'Monuments & Memorials', value: 'iron_cross', label: 'Iron Cross' },
  { group: 'Monuments & Memorials', value: 'gravestone_notable', label: 'Gravestone (notable)' },

  // Archaeology
  { group: 'Archaeology', value: 'bullaun_stone', label: 'Bullaun Stone' },
  { group: 'Archaeology', value: 'standing_stone', label: 'Standing Stone' },
  { group: 'Archaeology', value: 'souterrain', label: 'Souterrain' },

  // Religious Structures
  { group: 'Religious Structures', value: 'church', label: 'Church' },
  { group: 'Religious Structures', value: 'church_in_ruins', label: 'Church in Ruins' },
  { group: 'Religious Structures', value: 'church_site_of', label: 'Church (site of)' },
  { group: 'Religious Structures', value: 'grotto', label: 'Grotto' },
  { group: 'Religious Structures', value: 'mass_rock', label: 'Mass Rock' },
  { group: 'Religious Structures', value: 'altar', label: 'Altar' },

  // Boundaries & Access
  { group: 'Boundaries & Access', value: 'boundary_wall', label: 'Boundary Wall' },
  { group: 'Boundaries & Access', value: 'gate_gate_piers', label: 'Gate / Gate Piers' },
  { group: 'Boundaries & Access', value: 'stile', label: 'Stile' },
  { group: 'Boundaries & Access', value: 'coffin_rest', label: 'Coffin Rest' },

  // Natural
  { group: 'Natural', value: 'natural_feature', label: 'Natural Feature' },
  { group: 'Natural', value: 'holy_well', label: 'Holy Well' },

  // Other
  { group: 'Other', value: 'other', label: 'Other' },
] as const

export type GraveyardCategoryValue = (typeof GRAVEYARD_CATEGORIES)[number]['value']
export type GraveyardCategoryLabel = (typeof GRAVEYARD_CATEGORIES)[number]['label']
