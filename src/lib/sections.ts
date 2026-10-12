/**
 * Stadium layout. 1 unit = 1 metre. Pitch runs along X (try lines at x = ±50,
 * dead-ball lines at x = ±60), touchlines at z = ±35. +Z is the near (camera) side.
 */
export type SectionId = 'about' | 'projects' | 'experience' | 'leadership' | 'skills' | 'contact'
export type Vec3 = [number, number, number]

export type SectionMeta = {
  id: SectionId
  key: string
  title: string
  zone: string
  blurb: string
  /** Where the floating hotspot label sits. */
  hotspot: Vec3
  /** Camera framing when the section is opened. */
  camera: { position: Vec3; target: Vec3 }
  /** Where the ball is passed to when travelling to this section. */
  ballSpot: Vec3
}

export const BALL_HOME: Vec3 = [0, 0.62, 0]

export const SECTIONS: SectionMeta[] = [
  {
    id: 'about',
    key: '1',
    title: 'About Me',
    zone: 'Center Field',
    blurb: 'Who I am and how I play the game',
    hotspot: [0, 4.2, 0],
    camera: { position: [5.5, 2.6, 7.5], target: [0, 1.2, 0] },
    ballSpot: BALL_HOME,
  },
  {
    id: 'projects',
    key: '2',
    title: 'Projects',
    zone: 'Left Try Zone',
    blurb: 'The playbook: seven plays I have run',
    hotspot: [-44, 10.8, 0],
    camera: { position: [0, 10, 0], target: [-40, 5, 0] },
    ballSpot: [-28, 0.62, 5],
  },
  {
    id: 'experience',
    key: '3',
    title: 'Experience',
    zone: 'Right Try Zone',
    blurb: 'Match progression, 2023 to now',
    hotspot: [44, 4.5, 16.5],
    camera: { position: [18, 10, 0], target: [44, 4, 0] },
    ballSpot: [30, 0.62, -5],
  },
  {
    id: 'leadership',
    key: '4',
    title: 'Leadership',
    zone: 'North Stand',
    blurb: 'The team sheet: no one scores alone',
    hotspot: [0, 13, -42],
    camera: { position: [0, 8.5, 4], target: [0, 7.5, -42] },
    ballSpot: [0, 0.62, -28],
  },
  {
    id: 'skills',
    key: '5',
    title: 'Technical Skills',
    zone: 'Training Ground',
    blurb: 'Drills I run every week',
    hotspot: [0, 6, 41],
    camera: { position: [0, 11, 8], target: [0, 2, 42] },
    ballSpot: [6, 0.62, 33],
  },
  {
    id: 'contact',
    key: '6',
    title: 'Contact',
    zone: 'Goalposts',
    blurb: "Let's build something great together",
    hotspot: [50, 18.5, 0],
    // from behind the kicker: #13 on the left, posts in the middle, panel on the right
    camera: { position: [18, 5, 19], target: [46, 7, -3] },
    ballSpot: [32, 0.62, 9],
  },
]

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, SectionMeta>

export const OVERVIEW = { position: [0, 64, 100] as Vec3, target: [0, 0, 6] as Vec3 }
export const INTRO_START = { position: [0, 30, 120] as Vec3, target: [0, 2, 0] as Vec3 }
export const INTRO_END = { position: [-2.2, 1.9, 7.4] as Vec3, target: [-3.4, 1.5, 0] as Vec3 }

// ---- Object layouts shared by the 3D scene and the camera rig ----

/** Project hologram cards arc around the left in-goal, facing the field. */
export function projectCardTransform(i: number, count: number) {
  const center = { x: -20, z: 0 }
  const radius = 24
  const spread = Math.PI * 0.5
  const a = Math.PI + (count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1))
  const x = center.x + radius * Math.cos(a)
  const z = center.z + radius * Math.sin(a)
  const rotY = Math.atan2(center.x - x, center.z - z)
  return { position: [x, 5, z] as Vec3, rotationY: rotY }
}

export function projectCamera(i: number, count: number) {
  const { position, rotationY } = projectCardTransform(i, count)
  const nx = Math.sin(rotationY)
  const nz = Math.cos(rotationY)
  return {
    position: [position[0] + nx * 13, position[1] + 1, position[2] + nz * 13] as Vec3,
    target: position,
  }
}

/** Experience markers stand in a line across the right in-goal (left to right = oldest to newest). */
export function experienceMarkerPosition(i: number, count: number): Vec3 {
  // leave a gap in the middle so the goalposts stay clear for the Contact view
  const fixed = [-21, -12, 12, 21]
  const z = count === 4 ? fixed[i] : count === 1 ? 0 : -21 + (42 * i) / (count - 1)
  return [44, 0, z]
}

export function experienceCamera(i: number, count: number) {
  const p = experienceMarkerPosition(i, count)
  return { position: [p[0] - 15, 6, p[2] * 0.75] as Vec3, target: [p[0], 4, p[2]] as Vec3 }
}

/** Leadership banners hang along the north stand facade. */
export function bannerPosition(i: number, count: number): Vec3 {
  const span = 36
  const x = count === 1 ? 0 : -span / 2 + (span * i) / (count - 1)
  return [x, 7.5, -41.4]
}

export function bannerCamera(i: number, count: number) {
  const p = bannerPosition(i, count)
  return { position: [p[0] * 0.8, 7, -21] as Vec3, target: [p[0], 7, p[2]] as Vec3 }
}

/** Tackle bags in the training ground (south touchline). */
export function bagPosition(i: number, count: number): Vec3 {
  const span = 26
  const x = count === 1 ? 0 : span / 2 - (span * i) / (count - 1)
  return [x, 0, 42]
}

export function bagCamera(i: number, count: number) {
  const p = bagPosition(i, count)
  return { position: [p[0] * 0.85, 7.5, 24] as Vec3, target: [p[0], 2.6, p[2]] as Vec3 }
}

export const GOALPOSTS_X = 50
export const TROPHY_POS: Vec3 = [-63.5, 0, -31]

// ---- #13 player positions ----

/** Where the player stands for each section, and what he faces once there. */
export const PLAYER_SPOTS: Record<SectionId | 'home', { pos: Vec3; face: Vec3 }> = {
  home: { pos: [2.4, 0, 1.3], face: [0, 0, 60] },
  about: { pos: [1.9, 0, 0.9], face: [5.5, 0, 7.5] },
  projects: { pos: [-25, 0, 7.5], face: [-40, 0, 0] },
  experience: { pos: [27, 0, -2.5], face: [44, 0, -6] },
  leadership: { pos: [2.6, 0, -25.5], face: [0, 0, -42] },
  skills: { pos: [3.4, 0, 30.8], face: [0, 0, 42] },
  contact: { pos: [27.5, 0, 9.45], face: [32, 0, 9] },
}

/** Where the player waits during the intro, just behind the ball on its tee. */
export const PLAYER_INTRO: Vec3 = [0.55, 0, -1.7]

/** Conversion geometry: tee -> through the posts -> landing. */
export const CONVERSION_LANDING: Vec3 = [64, 0.62, -7]
export const KICK = {
  /** Start of the run-up: behind the ball and to the kicker's left. */
  runUp: [27.5, 0, 9.45] as Vec3,
  /** Plant foot beside the ball. */
  plant: [31.3, 0, 8.85] as Vec3,
}
