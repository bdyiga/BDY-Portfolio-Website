import { projects } from '../data/portfolio'
/**
 * Stadium layout. 1 unit = 1 metre. Pitch runs along X (try lines at x = ±50,
 * dead-ball lines at x = ±60), touchlines at z = ±35. +Z is the near (camera) side.
 */
export type SectionId = 'about' | 'projects' | 'experience' | 'leadership' | 'skills' | 'contact'
export type Vec3 = [number, number, number]

export type Framing = { position: Vec3; target: Vec3 }

/**
 * How the camera travels to a framing. Every zone has its own, so the six
 * arrivals never read as one move played six times.
 */
export type Move = {
  /** Timing of the travel: below 1 rushes then settles for a long time, above 1 builds slowly. */
  pace: number
  /** Timing of the pan and tilt: below 1 finds the subject early, above 1 reveals it late. */
  look: number
  /** Height added mid-move, as a fraction of the distance travelled. Negative skims the grass. */
  rise: number
  /** Sideways bow of the path, as a fraction of the distance travelled. Positive bows to the right. */
  swing: number
  /** Duration multiplier. */
  time: number
}

export type SectionMeta = {
  id: SectionId
  key: string
  title: string
  zone: string
  blurb: string
  /** Where the floating hotspot label sits. */
  hotspot: Vec3
  /** Camera framing when the section is opened (landscape screens). */
  camera: Framing
  /**
   * Portrait framing. Landscape shoots across a row of objects; portrait shoots
   * down the row, so the same objects stack up the screen instead of shrinking to fit its width.
   */
  tall: Framing
  move: Move
  /** Where the ball is passed to when travelling to this section. */
  ballSpot: Vec3
}

/** On its kicking tee. Anywhere else the ball stands on the grass, centre 0.4 m up. */
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
    // #13 head to toe from a low angle, the far floodlights over his shoulder
    tall: { position: [5.6, 1.5, 7], target: [1.9, 1.2, 0.9] },
    // push-in: covers the ground quickly, then creeps the last few metres
    move: { pace: 0.62, look: 0.6, rise: 0.03, swing: 0.12, time: 1.25 },
    ballSpot: BALL_HOME,
  },
  {
    id: 'projects',
    key: '2',
    title: 'Projects',
    zone: 'Left Try Zone',
    blurb: `The playbook: ${projects.length} plays I have run`,
    hotspot: [-44, 10.8, 0],
    camera: { position: [0, 10, 0], target: [-40, 5, 0] },
    // #13 in the foreground, the arc of cards running away behind him
    tall: { position: [-13.5, 3.7, -8.5], target: [-42, 5.7, 4] },
    // jib: skims the grass, then tilts up to find the cards
    move: { pace: 1.1, look: 1.5, rise: -0.1, swing: 0, time: 1.1 },
    ballSpot: [-31, 0.4, 2],
  },
  {
    id: 'experience',
    key: '3',
    title: 'Experience',
    zone: 'Right Try Zone',
    blurb: 'Match progression, 2023 to now',
    hotspot: [44, 4.5, 16.5],
    // from up the field: the four totems read left to right, 2023 to now, clear of the panel
    camera: { position: [0, 18, 16], target: [44, 3, 0] },
    // down the line of markers, oldest to newest
    tall: { position: [36, 2.6, 27], target: [45, 5, -2] },
    // truck: arrives travelling sideways along the try line
    move: { pace: 0.9, look: 0.8, rise: 0.04, swing: 0.3, time: 1.1 },
    ballSpot: [30, 0.4, -5],
  },
  {
    id: 'leadership',
    key: '4',
    title: 'Leadership',
    zone: 'North Stand',
    blurb: 'The team sheet: no one scores alone',
    hotspot: [0, 13, -42],
    // low from midfield: every banner across the frame, #13 big on the grass in front of them
    camera: { position: [0, 3.2, 2], target: [0, 7, -42] },
    // along the facade, banners and crowd stacked up the screen, #13 on the grass below them
    tall: { position: [-11, 6.5, -10], target: [3, 6, -40] },
    // pedestal: rises, and only tilts up to the banners at the end
    move: { pace: 0.85, look: 1.7, rise: 0.1, swing: 0, time: 1.15 },
    ballSpot: [0, 0.4, -28],
  },
  {
    id: 'skills',
    key: '5',
    title: 'Technical Skills',
    zone: 'Training Ground',
    blurb: 'Drills I run every week',
    hotspot: [0, 6, 41],
    camera: { position: [0, 11, 8], target: [0, 2, 42] },
    // down the row of tackle bags, the south stand behind them
    tall: { position: [26, 5.5, 37], target: [-2, 1.8, 43] },
    // whip pan: the head turns first, the body follows
    move: { pace: 1.2, look: 0.58, rise: 0.02, swing: -0.15, time: 1 },
    ballSpot: [6, 0.4, 33],
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
    // low behind the kicker, the posts standing the full height of the frame
    tall: { position: [20, 1.9, 13], target: [50, 7.5, 0] },
    // low arc round to the kicker's shoulder
    move: { pace: 0.8, look: 0.9, rise: -0.06, swing: -0.3, time: 1.2 },
    ballSpot: [32, 0.4, 9],
  },
]

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, SectionMeta>

export const OVERVIEW: Framing = { position: [0, 64, 100], target: [0, 0, 6] }
/** Portrait overview: from above the west end, so the pitch runs up the screen and fills it. */
export const OVERVIEW_TALL: Framing = { position: [-96, 76, 0], target: [8, 0, 0] }
/** Back to the overview: a crane out. */
export const OVERVIEW_MOVE: Move = { pace: 1, look: 0.8, rise: 0.18, swing: 0, time: 1 }
/** Between two things in the same zone: a short glide. */
export const ITEM_MOVE: Move = { pace: 0.9, look: 0.9, rise: 0.06, swing: 0, time: 0.9 }
/**
 * Title-card shot: a long lens from behind #13 as he stands over the ball,
 * looking down the pitch at the posts. `shift` slides the whole picture up the
 * screen (fraction of its height, like a shift lens) so he clears the lower-third;
 * phones stack the card under the shot, so they shift further.
 */
export const INTRO_SHOT = {
  wide: { position: [-17.5, 3.4, -4.2] as Vec3, target: [8, 2.0, 0.9] as Vec3, zoom: 1.9, shift: 0.2 },
  tall: { position: [-15, 3.2, -2.9] as Vec3, target: [8, 1.9, 0.5] as Vec3, zoom: 2.2, shift: 0.3 },
  /** How far the camera pushes in while the card is up (fraction of the distance to the target). */
  push: 0.12,
}

// ---- Object layouts shared by the 3D scene and the camera rig ----

/** Project hologram cards arc around the left in-goal, facing the field. */
export function projectCardTransform(i: number, count: number) {
  const center = { x: -20, z: 0 }
  const radius = 24
  // a quarter circle holds 7 cards edge to edge; widen the arc for more so they never overlap
  const spread = Math.PI * 0.5 * Math.max(1, (count - 1) / 6)
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
  // low and looking up, so there is grass in front of the wall for #13 to stand on
  return { position: [p[0] * 0.8, 3, -16] as Vec3, target: [p[0], 7, p[2]] as Vec3 }
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

type Spot = { pos: Vec3; face: Vec3 }

/**
 * Where the player stands for each section, and what he faces once there.
 * Each spot is in the section's shot, clear of the panel; `tall` is the spot
 * for the portrait framing, which looks at a different patch of grass.
 */
export const PLAYER_SPOTS: Record<SectionId | 'home', Spot & { tall?: Spot }> = {
  home: { pos: [2.4, 0, 1.3], face: [0, 0, 60] },
  about: { pos: [1.9, 0, 0.9], face: [5.5, 0, 7.5] },
  projects: { pos: [-24, 0, -2], face: [-40, 0, 0] },
  experience: {
    pos: [37.5, 0, -5.5],
    face: [44, 0, -6],
    tall: { pos: [38.5, 0, 15], face: [44, 0, 12] },
  },
  leadership: {
    pos: [-8, 0, -27],
    face: [0, 0, -42],
    tall: { pos: [-3.5, 0, -31.5], face: [0, 0, -42] },
  },
  skills: {
    pos: [6, 0, 28],
    face: [0, 0, 42],
    tall: { pos: [13.5, 0, 37.5], face: [-2, 0, 43] },
  },
  contact: { pos: [27.5, 0, 9.45], face: [32, 0, 9] },
}

/** Portrait phones get their own framings (and spots); same test as the camera rig. */
export const isTallScreen = () =>
  typeof window !== 'undefined' && window.innerWidth < 768 && window.innerWidth < window.innerHeight

export function playerSpot(id: SectionId | 'home'): Spot {
  const s = PLAYER_SPOTS[id]
  return (isTallScreen() && s.tall) || s
}

/** Where the player waits during the intro: behind the ball on its tee, facing the far posts. */
export const PLAYER_INTRO: Vec3 = [-1.7, 0, -0.55]
export const PLAYER_INTRO_FACE: Vec3 = [60, 0, -0.55]

/** Conversion geometry: tee -> through the posts -> landing. */
export const CONVERSION_LANDING: Vec3 = [60, 0.4, -5.5]
export const KICK = {
  /** Start of the run-up: behind the ball and to the kicker's left. */
  runUp: [27.5, 0, 9.45] as Vec3,
  /** Plant foot beside the ball. */
  plant: [31.3, 0, 8.85] as Vec3,
}
