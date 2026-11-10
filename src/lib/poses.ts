import { MathUtils } from 'three'
import type { Action } from './player'

/**
 * Hand-keyed moves for #13, shared by the rigged athlete (as a layer on top of
 * its motion-capture clips) and the code-only fallback figure (as the whole pose).
 * Every joint angle is in radians, measured from standing with the arms down.
 * "Forward" is positive: ShX raises an arm forward, ShZ raises it out to the side,
 * El and Knee bend, Hip swings a leg forward, lean tips the chest forward.
 */
export type Pose = {
  lean: number
  twist: number
  head: number
  lShX: number
  lShZ: number
  lEl: number
  rShX: number
  rShZ: number
  rEl: number
  lHip: number
  lKnee: number
  rHip: number
  rKnee: number
  bob: number
}

export const KEYS = Object.keys({
  lean: 0, twist: 0, head: 0, lShX: 0, lShZ: 0, lEl: 0, rShX: 0, rShZ: 0, rEl: 0,
  lHip: 0, lKnee: 0, rHip: 0, rKnee: 0, bob: 0,
}) as (keyof Pose)[]

export const IDLE: Pose = {
  lean: 0.04, twist: 0, head: 0,
  lShX: 0.05, lShZ: 0.14, lEl: 0.3,
  rShX: 0.05, rShZ: 0.14, rEl: 0.3,
  lHip: 0.04, lKnee: 0.08, rHip: -0.02, rKnee: 0.06,
  bob: 0,
}

type Frame = [number, Partial<Pose>]

export const ACTIONS: Record<Action, Frame[]> = {
  kick: [
    [0, {}],
    [0.18, { lean: 0.15, lShZ: 0.5, rShZ: 0.3, rHip: -0.75, rKnee: 1.45, lKnee: 0.3, bob: -0.08 }],
    [0.45, { lean: -0.12, lShZ: 1.0, lShX: 0.4, rShZ: 0.5, rShX: -0.4, rHip: 1.1, rKnee: 0.15, lKnee: 0.2, bob: 0.02 }],
    [0.68, { lean: -0.28, lShZ: 1.2, lShX: 0.6, rShZ: 0.6, rShX: -0.5, rHip: 1.75, rKnee: 0.25, lKnee: 0.1, bob: 0.12 }],
    [1, {}],
  ],
  pass: [
    [0, {}],
    [0.35, { twist: 0.9, lShX: 0.9, rShX: 0.7, lEl: 1.2, rEl: 1.4, lean: 0.1, lKnee: 0.25, rKnee: 0.25, bob: -0.05 }],
    [0.6, { twist: -0.6, lShX: 1.4, rShX: 1.3, lEl: 0.2, rEl: 0.2, lean: 0.15 }],
    [1, {}],
  ],
  celebrate: [
    [0, {}],
    [0.18, { lShZ: 2.7, rShZ: 2.7, lEl: 0.2, rEl: 0.2, bob: -0.1, lKnee: 0.4, rKnee: 0.4 }],
    [0.33, { lShZ: 2.85, rShZ: 2.85, lEl: 0.15, rEl: 0.15, bob: 0.45, lKnee: 0.1, rKnee: 0.1 }],
    [0.5, { lShZ: 2.7, rShZ: 2.7, lEl: 0.2, rEl: 0.2, bob: -0.05, lKnee: 0.35, rKnee: 0.35 }],
    [0.66, { lShZ: 2.85, rShZ: 2.85, lEl: 0.15, rEl: 0.15, bob: 0.4, lKnee: 0.1, rKnee: 0.1 }],
    [0.85, { lShZ: 2.6, rShZ: 2.6, lEl: 0.2, rEl: 0.2 }],
    [1, {}],
  ],
  wave: [
    [0, {}],
    [0.15, { rShZ: 2.5, rEl: 0.6, twist: 0.1 }],
    [0.85, { rShZ: 2.5, rEl: 0.6, twist: 0.1 }],
    [1, {}],
  ],
  pickup: [
    [0, {}],
    [0.45, { lean: 0.7, lHip: 0.55, rHip: 0.55, lKnee: 1.0, rKnee: 1.0, bob: -0.38, lShX: 1.2, rShX: 1.2, lEl: 0.25, rEl: 0.25, lShZ: 0.05, rShZ: 0.05 }],
    [1, { lShX: 0.9, rShX: 0.9, lEl: 1.5, rEl: 1.5, lShZ: 0.05, rShZ: 0.05 }],
  ],
  place: [
    [0, { lShX: 0.9, rShX: 0.9, lEl: 1.5, rEl: 1.5, lShZ: 0.05, rShZ: 0.05 }],
    [0.5, { lean: 0.7, lHip: 0.55, rHip: 0.55, lKnee: 1.0, rKnee: 1.0, bob: -0.38, lShX: 1.2, rShX: 1.2, lEl: 0.25, rEl: 0.25, lShZ: 0.05, rShZ: 0.05 }],
    [1, {}],
  ],
  point: [
    [0, {}],
    [0.3, { rShX: 1.45, rShZ: 0.15, rEl: 0.05, twist: -0.2, lean: 0.06, head: -0.1 }],
    [0.75, { rShX: 1.45, rShZ: 0.15, rEl: 0.05, twist: -0.2, lean: 0.06, head: -0.1 }],
    [1, {}],
  ],
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export function sample(frames: Frame[], t: number, out: Pose) {
  let i = 0
  while (i < frames.length - 2 && t > frames[i + 1][0]) i++
  const [t0, a] = frames[i]
  const [t1, b] = frames[i + 1]
  const k = smooth(MathUtils.clamp((t - t0) / Math.max(1e-4, t1 - t0), 0, 1))
  for (const key of KEYS) {
    const va = a[key] ?? IDLE[key]
    const vb = b[key] ?? IDLE[key]
    out[key] = va + (vb - va) * k
  }
}

export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
