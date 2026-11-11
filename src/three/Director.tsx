import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import gsap from 'gsap'
import { Box3, MathUtils, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { experiences, leadership, projects, skillGroups } from '../data/portfolio'
import {
  bagCamera,
  bannerCamera,
  CONVERSION_LANDING,
  experienceCamera,
  type Framing,
  INTRO_SHOT,
  ITEM_MOVE,
  type Move,
  OVERVIEW,
  OVERVIEW_MOVE,
  OVERVIEW_TALL,
  PLAYER_INTRO,
  PLAYER_INTRO_FACE,
  PLAYER_SPOTS,
  projectCamera,
  SECTION_BY_ID,
  type SectionId,
  type Vec3,
} from '../lib/sections'
import { ball, flyBall, lighting } from '../lib/sceneState'
import { clearOf, newSequence, player, playAction, runTo } from '../lib/player'
import { deliver, kickAgain, setMark } from '../lib/choreo'
import { useStore } from '../state/store'
import { towerPower } from './Atmosphere'

type View = Framing

const v = (a: Vec3) => new Vector3(a[0], a[1], a[2])

/** Ease with zero speed at both ends. `bias` below 1 rushes then settles, above 1 builds slowly. */
const eased = (t: number, bias: number) => MathUtils.smootherstep(Math.pow(t, bias), 0, 1)

/** Keeps a camera path off the grass without a visible kink where it levels out. */
const softFloor = (y: number, floor: number) => {
  const knee = floor + 2.4
  return y >= knee ? y : floor + 2.4 * Math.exp((y - knee) / 2.4)
}

/** Where a camera at `from` looking at `to` is pointing: heading, elevation and distance. */
function aim(from: Vector3, to: Vector3) {
  const d = to.clone().sub(from)
  const r = Math.max(d.length(), 0.001)
  return { r, az: Math.atan2(d.x, d.z), el: Math.asin(MathUtils.clamp(d.y / r, -1, 1)) }
}

function viewFor(section: SectionId | null, item: number | null, tall: boolean): View {
  if (!section) return tall ? OVERVIEW_TALL : OVERVIEW
  if (item !== null) {
    if (section === 'projects') return projectCamera(item, projects.length)
    if (section === 'experience') return experienceCamera(item, experiences.length)
    if (section === 'leadership') return bannerCamera(item, leadership.length)
    if (section === 'skills') return bagCamera(item, skillGroups.length)
  }
  return tall ? SECTION_BY_ID[section].tall : SECTION_BY_ID[section].camera
}

/** The top bar covers this much of a phone screen; the sheet covers `sheet` of it from the bottom. */
const TOP_BAR = 0.066
/** Lens shift that centres the subject in the strip of screen left between the top bar and the sheet. */
const shiftFor = (sheet: number) => Math.max(0, (sheet - TOP_BAR) / 2)

/** Vertical FOV: widen on portrait screens so the pitch still fits without a huge pull-back. */
export function fovFor(aspect: number) {
  return aspect >= 1 ? 45 : Math.min(78, 45 + (1 - aspect) * 60)
}

/** Pull the camera back on narrow / portrait screens so the horizontal framing matches a 16:10 desktop. */
function fitToAspect(view: View, aspect: number, isOverview: boolean): View {
  const half = (deg: number) => Math.tan(MathUtils.degToRad(deg / 2))
  const desktop = half(45) * 1.6
  const here = half(fovFor(aspect)) * aspect
  const raw = Math.max(1, desktop / here)
  const k = isOverview ? Math.min(raw, 2.2) : Math.min(Math.sqrt(raw), 1.7)
  if (k === 1) return view
  const t = v(view.target)
  const p = v(view.position).sub(t).multiplyScalar(isOverview ? k : Math.sqrt(k)).add(t)
  return { position: [p.x, p.y, p.z], target: view.target }
}

const GROUND = new Plane(new Vector3(0, 1, 0), 0)
const _markCam = new PerspectiveCamera()
const _ray = new Raycaster()
const _ndc = new Vector2()

/**
 * Where #13 should stand to be in a shot: the patch of grass that will show in
 * the clear part of the screen (left of the panel, or above the sheet) once the
 * camera settles. `low` is how far down the screen his feet go (0 = top).
 */
function markFor(view: View, offset: Vec3, shift: number, aspect: number, low: number) {
  const cam = _markCam
  cam.fov = fovFor(aspect)
  cam.aspect = aspect
  cam.near = 0.5
  cam.far = 1200
  cam.updateProjectionMatrix()
  cam.position.copy(v(view.position))
  cam.lookAt(v(view.target))
  // the focal offset trucks camera and target together, in the camera's own axes
  const o = v(offset).applyQuaternion(cam.quaternion)
  cam.position.add(o)
  cam.updateMatrixWorld()
  const target = v(view.target).add(o)
  const hit = new Vector3()
  // feet low in the clear area; if that misses the grass (a shot looking up), try higher
  for (let y = low; y > low - 0.3; y -= 0.05) {
    _ndc.set(0.3 * 2 - 1, 1 - (y + shift) * 2)
    _ray.setFromCamera(_ndc, cam)
    if (!_ray.ray.intersectPlane(GROUND, hit)) continue
    const d = hit.distanceTo(cam.position)
    if (d < 7 || d > 45) continue
    hit.set(MathUtils.clamp(hit.x, -64, 64), 0, MathUtils.clamp(hit.z, -38, 45))
    clearOf(hit)
    return { pos: [hit.x, 0, hit.z] as Vec3, face: [target.x, 0, target.z] as Vec3 }
  }
  return null
}

/** The rundown strip at the bottom of the phone overview, as a fraction of the screen. */
const RUNDOWN = 0.2
/** Lowest the camera may look up from: enough for a hero angle on the posts, never under the pitch. */
const LOW_ANGLE = Math.PI * 0.62
const _target = new Vector3()

export function Director() {
  const controls = useRef<CameraControls>(null)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const phase = useStore((s) => s.phase)
  const section = useStore((s) => s.section)
  const item = useStore((s) => (s.section ? s.item[s.section] : null))
  const kickNonce = useStore((s) => s.kickNonce)
  const sheetCollapsed = useStore((s) => s.sheetCollapsed)
  const camTween = useRef<gsap.core.Animation | null>(null)
  const introTl = useRef<gsap.core.Timeline | null>(null)
  const prevSection = useRef<SectionId | null>(null)
  /** Vertical lens shift (fraction of the viewport height); only the title card uses it. */
  const lens = useRef({ shift: 0, applied: '' })

  const panelOpen = section !== null
  const aspect = size.width / size.height
  /** Below this width the panel is a bottom sheet (matches the `md` breakpoint in the CSS). */
  const sheetLayout = size.width < 768
  /** Portrait phones get their own framings; everything else reuses the landscape ones. */
  const tall = sheetLayout && aspect < 1

  /**
   * Camera move. The position travels along a bowed path and the camera pans
   * and tilts between the two headings (it never swings through its own
   * subject); `move` sets the timing and shape, so each zone arrives differently.
   */
  const moveTo = (
    view: View,
    opts: { move?: Move; duration?: number; offset?: Vec3; shift?: number; instant?: boolean } = {},
  ) => {
    const c = controls.current
    if (!c) return
    camTween.current?.kill()
    const move = opts.move ?? OVERVIEW_MOVE
    const fromP = c.getPosition(new Vector3())
    const fromT = c.getTarget(new Vector3())
    const fromO = c.getFocalOffset(new Vector3())
    const toP = v(view.position)
    const toT = v(view.target)
    const toO = v(opts.offset ?? [0, 0, 0])
    const dist = fromP.distanceTo(toP)
    // the title card is shot on a long lens; every move out of it eases back to the normal one
    const fromZ = camera.zoom
    const fromS = lens.current.shift
    const toS = opts.shift ?? 0
    const reduced = useStore.getState().reducedMotion
    const reframed = Math.abs(fromS - toS) > 0.001 || fromO.distanceTo(toO) > 0.01 || fromT.distanceTo(toT) > 0.01
    if (opts.instant || reduced || (dist < 0.01 && fromZ === 1 && !reframed)) {
      c.maxPolarAngle = LOW_ANGLE
      c.setLookAt(toP.x, toP.y, toP.z, toT.x, toT.y, toT.z, false)
      c.setFocalOffset(toO.x, toO.y, toO.z, false)
      c.zoomTo(1, false)
      lens.current.shift = toS
      c.enabled = true
      return
    }
    const a0 = aim(fromP, fromT)
    const a1 = aim(toP, toT)
    // pan the short way round
    const pan = MathUtils.euclideanModulo(a1.az - a0.az + Math.PI, Math.PI * 2) - Math.PI
    const rise = MathUtils.clamp(dist * move.rise, -8, 18)
    const swing = MathUtils.clamp(dist * move.swing, -22, 22)
    const side = new Vector3(toP.z - fromP.z, 0, fromP.x - toP.x)
    if (side.lengthSq() > 1) side.normalize()
    else side.set(0, 0, 0)
    const floor = Math.min(1.5, fromP.y, toP.y)
    const duration =
      opts.duration ??
      MathUtils.clamp((0.9 + dist / 70 + (Math.abs(pan) / Math.PI) * 0.5) * move.time, dist < 0.01 ? 0.5 : 1.1, 2.8)
    const p = { t: 0 }
    const P = new Vector3()
    const T = new Vector3()
    const O = new Vector3()
    c.enabled = false
    c.maxPolarAngle = LOW_ANGLE
    camTween.current = gsap.to(p, {
      t: 1,
      duration,
      ease: 'none',
      onUpdate: () => {
        const e = eased(p.t, move.pace)
        const l = eased(p.t, move.look)
        const bow = Math.sin(Math.PI * e)
        P.lerpVectors(fromP, toP, e).addScaledVector(side, bow * swing)
        P.y = softFloor(P.y + bow * rise, floor)
        const az = a0.az + pan * l
        const el = MathUtils.lerp(a0.el, a1.el, l)
        const r = MathUtils.lerp(a0.r, a1.r, e)
        T.set(P.x + Math.sin(az) * Math.cos(el) * r, P.y + Math.sin(el) * r, P.z + Math.cos(az) * Math.cos(el) * r)
        O.lerpVectors(fromO, toO, e)
        c.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false)
        c.setFocalOffset(O.x, O.y, O.z, false)
        if (fromZ !== 1) c.zoomTo(MathUtils.lerp(fromZ, 1, e), false)
        lens.current.shift = MathUtils.lerp(fromS, toS, e)
      },
      onComplete: () => {
        c.setLookAt(toP.x, toP.y, toP.z, toT.x, toT.y, toT.z, false)
        c.enabled = true
      },
    })
  }

  // ---- Responsive field of view ----
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    cam.fov = fovFor(aspect)
    cam.updateProjectionMatrix()
  }, [camera, aspect])

  // ---- Controls setup ----
  useEffect(() => {
    const c = controls.current
    if (!c) return
    c.setBoundary(new Box3(new Vector3(-95, 0, -70), new Vector3(95, 40, 95)))
    c.boundaryEnclosesCamera = false
    const onStart = () => useStore.getState().markInteracted()
    c.addEventListener('controlstart', onStart)
    return () => c.removeEventListener('controlstart', onStart)
  }, [])

  // ---- Intro / entering choreography ----
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const reduced = useStore.getState().reducedMotion

    if (phase === 'intro') {
      c.enabled = false
      introTl.current?.kill()
      // #13 stands over the ball with his back (YIGA 13) to the camera
      newSequence()
      runTo(PLAYER_INTRO, { instant: true, face: PLAYER_INTRO_FACE })
      const shot = size.width >= 900 ? INTRO_SHOT.wide : INTRO_SHOT.tall
      const E = v(shot.position)
      const T = v(shot.target)
      c.zoomTo(shot.zoom, false)
      c.setFocalOffset(0, 0, 0, false)
      lens.current.shift = shot.shift
      if (reduced) {
        lighting.level = 1
        towerPower.fill(1)
        c.setLookAt(E.x, E.y, E.z, T.x, T.y, T.z, false)
        return
      }
      // locked-off shot: the floodlights are the motion, the camera only creeps in
      lighting.level = 0
      towerPower.fill(0)
      const S = E.clone().sub(T).multiplyScalar(1 + INTRO_SHOT.push).add(T)
      c.setLookAt(S.x, S.y, S.z, T.x, T.y, T.z, false)
      const tl = gsap.timeline()
      tl.to(lighting, { level: 1, duration: 1.4, ease: 'power2.out' }, 0.1)
      // far towers first, so the light arrives from the posts towards the camera
      ;[1, 3, 0, 2].forEach((i, n) => {
        tl.to(
          towerPower,
          {
            keyframes: [
              { [i]: 0.9, duration: 0.05 },
              { [i]: 0.15, duration: 0.07 },
              { [i]: 1, duration: 0.3, ease: 'power2.out' },
            ],
          },
          0.25 + n * 0.3,
        )
      })
      const p = { t: 0 }
      const P = new Vector3()
      tl.to(
        p,
        {
          t: 1,
          duration: 14,
          ease: 'power2.out',
          onUpdate: () => {
            P.lerpVectors(S, E, p.t)
            c.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false)
          },
        },
        0,
      )
      introTl.current = tl
      return () => {
        tl.kill()
      }
    }

    if (phase === 'entering') {
      introTl.current?.kill()
      lighting.level = 1
      towerPower.fill(1)
      const overview = tall ? OVERVIEW_TALL : fitToAspect(OVERVIEW, aspect, true)
      const toS = tall ? shiftFor(RUNDOWN) : 0
      c.maxPolarAngle = LOW_ANGLE
      if (reduced) {
        c.setLookAt(...overview.position, ...overview.target, false)
        c.zoomTo(1, false)
        lens.current.shift = toS
        useStore.getState().setPhase('world')
        return
      }
      c.enabled = false
      // up-and-under: #13 boots the ball sky high and the camera rides up with it
      const alive = newSequence()
      playAction('kick', {
        at: 0.45,
        onAt: () => flyBall(ball.home, { height: 15, duration: 2.4, style: 'tumble' }),
      }).then((ok) => {
        if (ok && alive()) runTo(PLAYER_SPOTS.home.pos, { face: PLAYER_SPOTS.home.face })
      })
      const fromP = c.getPosition(new Vector3())
      const fromZ = camera.zoom
      const fromS = lens.current.shift
      // landscape swings out over the near touchline; portrait cranes straight up and back from behind him
      const ctrl = tall ? new Vector3(-58, 14, -2) : new Vector3(-14, 22, 44)
      const toP = v(overview.position)
      const toT = v(overview.target)
      const P = new Vector3()
      const T = new Vector3()
      const p = { t: 0 }
      camTween.current?.kill()
      camTween.current = gsap.to(p, {
        t: 1,
        duration: 3.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = p.t
          // quadratic bezier for the camera path
          P.copy(fromP).multiplyScalar((1 - t) * (1 - t))
            .addScaledVector(ctrl, 2 * (1 - t) * t)
            .addScaledVector(toP, t * t)
          const follow = 1 - MathUtils.smoothstep(t, 0.3, 0.95)
          T.copy(toT).lerp(ball.pos, follow)
          c.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false)
          // ease off the long lens early so the pull-back reads as one move
          const k = MathUtils.smootherstep(t, 0, 0.6)
          c.zoomTo(MathUtils.lerp(fromZ, 1, k), false)
          lens.current.shift = MathUtils.lerp(fromS, toS, k)
        },
        onComplete: () => {
          c.enabled = true
          useStore.getState().setPhase('world')
        },
      })
      return
    }

    if (phase === 'world') {
      introTl.current?.kill()
      if (lighting.level < 1) gsap.to(lighting, { level: 1, duration: reduced ? 0 : 0.8 })
      if (towerPower.some((x) => x < 1)) gsap.to(towerPower, { 0: 1, 1: 1, 2: 1, 3: 1, duration: reduced ? 0 : 0.6, stagger: 0.1 })
      c.enabled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ---- Section / item camera framing ----
  const lastSection = useRef<SectionId | null>(null)
  useEffect(() => {
    if (phase !== 'world') return
    const framed = viewFor(section, item, tall)
    // the zone framings are composed per orientation; the close-ups and the landscape overview are fitted
    const view = (section !== null && item === null) || (section === null && tall) ? framed : fitToAspect(framed, aspect, section === null)
    const dist = v(view.position).distanceTo(v(view.target))
    let offset: Vec3 = [0, 0, 0]
    let shift = 0
    if (sheetLayout) {
      // slide the picture up into the strip of screen the sheet (or the rundown) leaves free
      shift = shiftFor(panelOpen ? (sheetCollapsed ? 0.19 : 0.5) : RUNDOWN)
    } else if (panelOpen) offset = [dist * 0.24, 0, 0]
    // arriving in a zone plays that zone's move; moving about inside it is a short glide
    const move = section === null ? OVERVIEW_MOVE : section !== lastSection.current ? SECTION_BY_ID[section].move : ITEM_MOVE
    lastSection.current = section
    moveTo(view, { move, offset, shift })
    // #13 finds his mark in the new shot (the intro card, About and the kick at the posts have their own)
    if (section && section !== 'about' && section !== 'contact') {
      const clearTo = sheetLayout ? (panelOpen ? (sheetCollapsed ? 0.81 : 0.5) : 1 - RUNDOWN) : 1
      setMark(markFor(view, offset, shift, aspect, clearTo - (sheetLayout ? 0.05 : 0.2)), useStore.getState().reducedMotion)
    } else setMark(null, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, section, item, aspect, tall, sheetLayout, panelOpen, sheetCollapsed])

  // ---- Ball choreography: pass to the section, kick for contact ----
  const kickConversion = () => {
    const st = useStore.getState()
    flyBall(CONVERSION_LANDING, {
      height: 9,
      duration: st.reducedMotion ? 0 : 1.7,
      style: 'tumble',
      onComplete: () => {
        const s = useStore.getState()
        if (player.mode === 'idle') playAction('celebrate', { instant: s.reducedMotion })
        s.scoreConversion()
        const n = useStore.getState().conversions
        s.showToast({
          title: 'Conversion! +2',
          body: n === 1 ? 'Straight between the posts. The crowd is on its feet.' : `That's ${n} conversions this visit. Coach is impressed.`,
        })
        // the ball stays in the in-goal; #13 fetches it on his next play
      },
    })
  }

  // ---- #13 fetches the ball, carries it to the section and passes (or kicks) it ----
  useEffect(() => {
    if (phase !== 'world') return
    if (section === prevSection.current) return
    prevSection.current = section
    deliver(section, useStore.getState().reducedMotion, kickConversion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, section])

  useEffect(() => {
    if (kickNonce === 0) return
    kickAgain(useStore.getState().reducedMotion, kickConversion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kickNonce])

  // ---- Apply the lens shift (a view offset keeps the perspective; only the framing slides) ----
  useFrame(() => {
    // free orbit may drop to a low angle under a high subject (the posts, the stand) but never below the grass
    const c = controls.current
    if (c?.enabled) {
      const ty = c.getTarget(_target).y
      c.maxPolarAngle = MathUtils.clamp(Math.acos(MathUtils.clamp((1 - ty) / c.distance, -1, 1)), Math.PI * 0.3, LOW_ANGLE)
    }
    const l = lens.current
    const key = `${l.shift.toFixed(4)}:${size.width}x${size.height}`
    if (key === l.applied) return
    l.applied = key
    const cam = camera as PerspectiveCamera
    if (l.shift === 0) cam.clearViewOffset()
    else cam.setViewOffset(size.width, size.height, 0, l.shift * size.height, size.width, size.height)
  })

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2.5}
      maxDistance={170}
      smoothTime={0.3}
      draggingSmoothTime={0.14}
      dollySpeed={0.6}
      azimuthRotateSpeed={0.6}
      polarRotateSpeed={0.5}
    />
  )
}
