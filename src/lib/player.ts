import gsap from 'gsap'
import { MathUtils, Vector3 } from 'three'
import type { Vec3 } from './sections'

/**
 * The #13 player: a code-only character that runs around the stadium.
 * Like the ball, its per-frame state lives outside React; the <Player/>
 * component reads it every frame and turns it into a pose.
 */
export type Action = 'kick' | 'pass' | 'celebrate' | 'wave' | 'point'

export const ACTION_DURATION: Record<Action, number> = {
  kick: 0.95,
  pass: 0.75,
  celebrate: 1.6,
  wave: 1.4,
  point: 1.1,
}

export const player = {
  pos: new Vector3(0.6, 0, -1.8),
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

/** Jog/sprint in a straight line. Resolves false if interrupted by another move. */
export function runTo(
  to: Vec3 | Vector3,
  opts: { face?: XZ | number; speed?: number; instant?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    player.moveTween?.kill()
    stopAction()
    const target = Array.isArray(to) ? new Vector3(to[0], 0, to[2]) : new Vector3(to.x, 0, to.z)
    const from = player.pos.clone()
    const dist = from.distanceTo(target)
    const faceYaw =
      typeof opts.face === 'number' ? opts.face : opts.face !== undefined ? yawTo(target, opts.face) : undefined

    if (opts.instant || dist < 0.05) {
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

    const speed = opts.speed ?? MathUtils.clamp(dist / 2.4, 9, 24)
    player.mode = 'run'
    player.speed = speed
    player.targetYaw = yawTo(from, target)
    const p = { t: 0 }
    player.moveTween = gsap.to(p, {
      t: 1,
      duration: dist / speed,
      ease: 'power1.inOut',
      onUpdate: () => {
        player.pos.lerpVectors(from, target, p.t)
      },
      onComplete: () => {
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
