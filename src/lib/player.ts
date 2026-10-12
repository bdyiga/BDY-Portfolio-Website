import gsap from 'gsap'
import { MathUtils, Vector3 } from 'three'
import { experiences, projects, skillGroups } from '../data/portfolio'
import {
  bagPosition,
  experienceMarkerPosition,
  GOALPOSTS_X,
  projectCardTransform,
  TROPHY_POS,
  type Vec3,
} from './sections'

/**
 * The #13 player: a code-only character that runs around the stadium.
 * Like the ball, its per-frame state lives outside React; the <Player/>
 * component reads it every frame and turns it into a pose.
 */
export type Action = 'kick' | 'pass' | 'celebrate' | 'wave' | 'point' | 'pickup' | 'place'

export const ACTION_DURATION: Record<Action, number> = {
  kick: 0.95,
  pass: 0.75,
  celebrate: 1.6,
  wave: 1.4,
  point: 1.1,
  pickup: 0.6,
  place: 0.6,
}

export const player = {
  pos: new Vector3(0.55, 0, -1.7),
  /** Current facing (radians, 0 = +Z). Eased toward targetYaw each frame. */
  yaw: 0,
  targetYaw: 0,
  speed: 0,
  mode: 'idle' as 'idle' | 'run' | 'action',
  action: null as Action | null,
  actionT: 0,
  moveTween: null as gsap.core.Tween | null,
  actionTween: null as gsap.core.Tween | null,
  /** Choreography token: bumping it cancels any multi-step sequence in flight. */
  seq: 0,
}

type XZ = { x: number; z: number } | Vec3
const xz = (p: XZ) => (Array.isArray(p) ? { x: p[0], z: p[2] } : p)

export const yawTo = (from: XZ, to: XZ) => {
  const a = xz(from)
  const b = xz(to)
  return Math.atan2(b.x - a.x, b.z - a.z)
}

/** Start a new choreography; returns a function that reports whether it is still current. */
export function newSequence() {
  const id = ++player.seq
  return () => id === player.seq
}

function stopAction() {
  player.actionTween?.kill()
  player.actionTween = null
  player.action = null
}

/* ------------------------------------------------------------------ */
/* Obstacle-aware paths                                                */
/* ------------------------------------------------------------------ */

type Obstacle = { x: number; z: number; r: number }

/** Things #13 should run around (radius includes his body). */
const OBSTACLES: Obstacle[] = [
  // goalposts + crossbar (too low to run under at his height)
  { x: -GOALPOSTS_X, z: 0, r: 4.4 },
  { x: GOALPOSTS_X, z: 0, r: 4.4 },
  // project holograms: wide screens on projector bases
  ...projects.map((_, i) => {
    const p = projectCardTransform(i, projects.length).position
    return { x: p[0], z: p[2], r: 3.6 }
  }),
  // experience totems
  ...experiences.map((_, i) => {
    const p = experienceMarkerPosition(i, experiences.length)
    return { x: p[0], z: p[2], r: 2.4 }
  }),
  // tackle bags
  ...skillGroups.map((_, i) => {
    const p = bagPosition(i, skillGroups.length)
    return { x: p[0], z: p[2], r: 1.4 }
  }),
  { x: TROPHY_POS[0], z: TROPHY_POS[2], r: 1.2 },
]

const inside = (p: Vector3, o: Obstacle) => Math.hypot(p.x - o.x, p.z - o.z) < o.r

/** Straight line, bent around any obstacle it would clip. */
function planPath(from: Vector3, to: Vector3): Vector3[] {
  const pts = [from.clone(), to.clone()]
  for (let iter = 0; iter < 8; iter++) {
    let inserted = false
    for (let i = 0; i < pts.length - 1 && !inserted; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const abx = b.x - a.x
      const abz = b.z - a.z
      const len2 = abx * abx + abz * abz
      if (len2 < 1e-6) continue
      let best: { o: Obstacle; t: number; d: number } | null = null
      for (const o of OBSTACLES) {
        // obstacles the endpoints are already inside are ignored (start/finish beside them)
        if (inside(a, o) || inside(b, o)) continue
        const t = MathUtils.clamp(((o.x - a.x) * abx + (o.z - a.z) * abz) / len2, 0, 1)
        const d = Math.hypot(a.x + abx * t - o.x, a.z + abz * t - o.z)
        if (d < o.r && (!best || t < best.t)) best = { o, t, d }
      }
      if (best) {
        const { o, t } = best
        const cx = a.x + abx * t
        const cz = a.z + abz * t
        let nx = cx - o.x
        let nz = cz - o.z
        let n = Math.hypot(nx, nz)
        if (n < 1e-3) {
          // dead centre: sidestep perpendicular to the run
          nx = -abz
          nz = abx
          n = Math.hypot(nx, nz)
        }
        const k = (o.r + 0.9) / n
        pts.splice(i + 1, 0, new Vector3(o.x + nx * k, 0, o.z + nz * k))
        inserted = true
      }
    }
    if (!inserted) break
  }
  return pts
}

/** Jog/sprint to a point, around obstacles. Resolves false if interrupted by another move. */
export function runTo(
  to: Vec3 | Vector3,
  opts: { face?: XZ | number; speed?: number; instant?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    player.moveTween?.kill()
    stopAction()
    const target = Array.isArray(to) ? new Vector3(to[0], 0, to[2]) : new Vector3(to.x, 0, to.z)
    const from = player.pos.clone().setY(0)
    const faceYaw =
      typeof opts.face === 'number' ? opts.face : opts.face !== undefined ? yawTo(target, opts.face) : undefined

    if (opts.instant || from.distanceTo(target) < 0.05) {
      player.pos.copy(target)
      if (faceYaw !== undefined) {
        player.targetYaw = faceYaw
        if (opts.instant) player.yaw = faceYaw
      }
      player.mode = 'idle'
      player.speed = 0
      resolve(true)
      return
    }

    const path = planPath(from, target)
    const lens: number[] = []
    let total = 0
    for (let i = 0; i < path.length - 1; i++) {
      const l = path[i].distanceTo(path[i + 1])
      lens.push(l)
      total += l
    }

    const speed = opts.speed ?? MathUtils.clamp(total / 2.4, 9, 24)
    player.mode = 'run'
    player.speed = speed
    player.targetYaw = yawTo(path[0], path[1])
    const p = { t: 0 }
    player.moveTween = gsap.to(p, {
      t: 1,
      duration: total / speed,
      ease: 'power1.inOut',
      onUpdate: () => {
        // walk the polyline by distance travelled
        let d = p.t * total
        let i = 0
        while (i < lens.length - 1 && d > lens[i]) {
          d -= lens[i]
          i++
        }
        player.pos.lerpVectors(path[i], path[i + 1], lens[i] > 0 ? Math.min(1, d / lens[i]) : 1)
        player.targetYaw = yawTo(path[i], path[i + 1])
      },
      onComplete: () => {
        player.pos.copy(target)
        player.mode = 'idle'
        player.speed = 0
        player.moveTween = null
        if (faceYaw !== undefined) player.targetYaw = faceYaw
        resolve(true)
      },
      onInterrupt: () => resolve(false),
    })
  })
}

/** Play a one-shot move. `onAt` fires once the move reaches progress `at` (e.g. boot meets ball). */
export function playAction(
  action: Action,
  opts: { at?: number; onAt?: () => void; instant?: boolean; face?: XZ | number } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    player.moveTween?.kill()
    player.moveTween = null
    stopAction()
    if (opts.face !== undefined) {
      player.targetYaw = typeof opts.face === 'number' ? opts.face : yawTo(player.pos, opts.face)
      if (opts.instant) player.yaw = player.targetYaw
    }
    if (opts.instant) {
      opts.onAt?.()
      player.mode = 'idle'
      resolve(true)
      return
    }
    player.mode = 'action'
    player.speed = 0
    player.action = action
    player.actionT = 0
    let fired = false
    const at = opts.at ?? 1
    player.actionTween = gsap.to(player, {
      actionT: 1,
      duration: ACTION_DURATION[action],
      ease: 'none',
      onUpdate: () => {
        if (!fired && player.actionT >= at) {
          fired = true
          opts.onAt?.()
        }
      },
      onComplete: () => {
        if (!fired) opts.onAt?.()
        player.mode = 'idle'
        player.action = null
        player.actionTween = null
        resolve(true)
      },
      onInterrupt: () => resolve(false),
    })
  })
}

/** Resolve once `cond` is true (polled), or false on timeout / cancellation. */
export function waitUntil(cond: () => boolean, alive: () => boolean, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = () => {
      if (!alive()) return resolve(false)
      if (cond()) return resolve(true)
      if (performance.now() - start > timeoutMs) return resolve(false)
      window.setTimeout(tick, 50)
    }
    tick()
  })
}
