import { Vector3 } from 'three'
import gsap from 'gsap'
import { BALL_HOME, type Vec3 } from './sections'

/**
 * Mutable, per-frame scene state shared between the 3D scene and DOM widgets
 * (minimap). Kept outside React to avoid re-rendering at 60fps.
 */
export const lighting = {
  /** 0 = stadium dark (intro start), 1 = fully lit. */
  level: 0,
  /** 0 = night, 1 = day. Tweened by the atmosphere. */
  day: 0,
}

export { cameraState } from './cameraState'

type BallMode = 'idle' | 'flight' | 'physics' | 'carried'

export const ball = {
  pos: new Vector3(...BALL_HOME),
  vel: new Vector3(),
  angVel: new Vector3(),
  mode: 'idle' as BallMode,
  /** Flight orientation: 'spiral' aligns the long axis with travel; 'tumble' goes end over end. */
  style: 'spiral' as 'spiral' | 'tumble',
  dir: new Vector3(1, 0, 0),
  spin: 0,
  home: new Vector3(...BALL_HOME),
  /** Where the ball last came to rest; free bounces return here. */
  rest: new Vector3(...BALL_HOME),
  tween: null as gsap.core.Tween | null,
  bounces: 0,
}

type FlightOpts = {
  height?: number
  duration?: number
  style?: 'spiral' | 'tumble'
  ease?: string
  instant?: boolean
  onComplete?: () => void
}

/** Parabolic flight from the ball's current position to `to`. */
export function flyBall(to: Vec3 | Vector3, opts: FlightOpts = {}) {
  ball.tween?.kill()
  const from = ball.pos.clone()
  const target = Array.isArray(to) ? new Vector3(...to) : to.clone()
  const dist = from.distanceTo(target)
  const height = opts.height ?? Math.min(14, 1.5 + dist * 0.22)
  const duration = opts.duration ?? Math.min(1.6, 0.55 + dist * 0.018)

  if (opts.instant || duration <= 0) {
    ball.pos.copy(target)
    ball.rest.copy(target)
    ball.mode = 'idle'
    opts.onComplete?.()
    return null
  }

  ball.mode = 'flight'
  ball.style = opts.style ?? 'spiral'
  ball.dir.copy(target).sub(from).setY(0)
  if (ball.dir.lengthSq() < 1e-4) ball.dir.set(1, 0, 0)
  ball.dir.normalize()

  const p = { t: 0 }
  ball.tween = gsap.to(p, {
    t: 1,
    duration,
    ease: opts.ease ?? 'none',
    onUpdate: () => {
      const t = p.t
      ball.pos.lerpVectors(from, target, t)
      ball.pos.y = from.y + (target.y - from.y) * t + 4 * height * t * (1 - t)
      ball.spin = t
    },
    onComplete: () => {
      ball.mode = 'idle'
      ball.tween = null
      ball.rest.copy(target)
      opts.onComplete?.()
    },
  })
  return ball.tween
}

/** Kick the ball into a free, physics-driven bounce (rugby balls never bounce straight). */
export function bounceBall() {
  ball.tween?.kill()
  ball.mode = 'physics'
  ball.bounces = 0
  ball.vel.set((Math.random() - 0.5) * 3, 7.5, (Math.random() - 0.5) * 3)
  ball.angVel.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 14)
}
