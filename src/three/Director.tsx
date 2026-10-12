import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import gsap from 'gsap'
import { Box3, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { experiences, leadership, projects, skillGroups } from '../data/portfolio'
import {
  bagCamera,
  bannerCamera,
  CONVERSION_LANDING,
  experienceCamera,
  INTRO_END,
  INTRO_START,
  OVERVIEW,
  PLAYER_INTRO,
  PLAYER_SPOTS,
  projectCamera,
  SECTION_BY_ID,
  type SectionId,
  type Vec3,
} from '../lib/sections'
import { ball, cameraState, flyBall, lighting } from '../lib/sceneState'
import { newSequence, player, playAction, runTo } from '../lib/player'
import { deliver, kickAgain } from '../lib/choreo'
import { useStore } from '../state/store'
import { towerPower } from './Atmosphere'

type View = { position: Vec3; target: Vec3 }

const v = (a: Vec3) => new Vector3(a[0], a[1], a[2])

/**
 * Phone framing for a section: #13 in the foreground at his spot, the zone's
 * content behind him. About is shot from the front so you see the IU crest.
 */
function playerCam(section: SectionId): View {
  const spot = section === 'contact' ? { pos: PLAYER_SPOTS.contact.pos, face: CONVERSION_LANDING } : PLAYER_SPOTS[section]
  const p = v(spot.pos)
  const f = v(spot.face).sub(p).setY(0).normalize()
  const right = new Vector3(-f.z, 0, f.x)
  // aim at him (not past him) so the sheet offset lifts him into the visible strip
  if (section === 'about') {
    const pos = p.clone().addScaledVector(f, 8).addScaledVector(right, 1.5)
    return { position: [pos.x, 3.2, pos.z], target: [p.x, 1.9, p.z] }
  }
  const pos = p.clone().addScaledVector(f, -8).addScaledVector(right, 2.4)
  const tgt = p.clone().addScaledVector(f, 1.5)
  return { position: [pos.x, 4, pos.z], target: [tgt.x, 2, tgt.z] }
}

function viewFor(section: SectionId | null, item: number | null): View {
  if (!section) return OVERVIEW
  if (item !== null) {
    if (section === 'projects') return projectCamera(item, projects.length)
    if (section === 'experience') return experienceCamera(item, experiences.length)
    if (section === 'leadership') return bannerCamera(item, leadership.length)
    if (section === 'skills') return bagCamera(item, skillGroups.length)
  }
  return SECTION_BY_ID[section].camera
}

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

  const panelOpen = section !== null
  const aspect = size.width / size.height
  const wide = size.width >= 900

  /** Smooth GSAP camera move with a gentle crane lift on long hops. */
  const moveTo = (view: View, opts: { duration?: number; offset?: Vec3; instant?: boolean } = {}) => {
    const c = controls.current
    if (!c) return
    camTween.current?.kill()
    const fromP = c.getPosition(new Vector3())
    const fromT = c.getTarget(new Vector3())
    const fromO = c.getFocalOffset(new Vector3())
    const toP = v(view.position)
    const toT = v(view.target)
    const toO = v(opts.offset ?? [0, 0, 0])
    const dist = fromP.distanceTo(toP)
    const reduced = useStore.getState().reducedMotion
    if (opts.instant || reduced || dist < 0.01) {
      c.setLookAt(toP.x, toP.y, toP.z, toT.x, toT.y, toT.z, false)
      c.setFocalOffset(toO.x, toO.y, toO.z, false)
      c.enabled = true
      return
    }
    const lift = Math.min(18, dist * 0.18)
    const duration = opts.duration ?? MathUtils.clamp(0.9 + dist / 70, 1.1, 2.3)
    const p = { t: 0 }
    const P = new Vector3()
    const T = new Vector3()
    const O = new Vector3()
    c.enabled = false
    camTween.current = gsap.to(p, {
      t: 1,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        P.lerpVectors(fromP, toP, p.t)
        P.y += Math.sin(Math.PI * p.t) * lift
        T.lerpVectors(fromT, toT, p.t)
        O.lerpVectors(fromO, toO, p.t)
        c.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false)
        c.setFocalOffset(O.x, O.y, O.z, false)
      },
      onComplete: () => {
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
      // #13 waits behind the ball, facing the camera's final intro position
      newSequence()
      runTo(PLAYER_INTRO, { instant: true, face: INTRO_END.position })
      if (reduced) {
        lighting.level = 1
        towerPower.fill(1)
        c.setLookAt(...INTRO_END.position, ...INTRO_END.target, false)
        return
      }
      lighting.level = 0
      towerPower.fill(0)
      c.setLookAt(...INTRO_START.position, ...INTRO_START.target, false)
      const tl = gsap.timeline()
      tl.to(lighting, { level: 1, duration: 3.2, ease: 'power1.in' }, 0.2)
      towerPower.forEach((_, i) => {
        tl.to(
          towerPower,
          {
            keyframes: [
              { [i]: 0.9, duration: 0.06 },
              { [i]: 0.1, duration: 0.09 },
              { [i]: 0.7, duration: 0.05 },
              { [i]: 1, duration: 0.35 },
            ],
          },
          0.5 + i * 0.45,
        )
      })
      const p = { t: 0 }
      const S = v(INTRO_START.position)
      const E = v(INTRO_END.position)
      const ST = v(INTRO_START.target)
      const ET = v(INTRO_END.target)
      const P = new Vector3()
      const T = new Vector3()
      tl.to(
        p,
        {
          t: 1,
          duration: 7,
          ease: 'power2.inOut',
          onUpdate: () => {
            P.lerpVectors(S, E, p.t)
            // swing in from slightly off-axis for parallax
            P.x += Math.sin(p.t * Math.PI) * 18
            T.lerpVectors(ST, ET, p.t)
            c.setLookAt(P.x, P.y, P.z, T.x, T.y, T.z, false)
          },
        },
        0.1,
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
      const overview = fitToAspect(OVERVIEW, aspect, true)
      if (reduced) {
        c.setLookAt(...overview.position, ...overview.target, false)
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
      const ctrl = new Vector3(12, 20, 42)
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
  useEffect(() => {
    if (phase !== 'world') return
    // phones: when a section opens (no specific item picked yet), follow #13 over the shoulder
    const phoneCam = !wide && section !== null && item === null
    const view = phoneCam ? playerCam(section) : fitToAspect(viewFor(section, item), aspect, section === null)
    const dist = v(view.position).distanceTo(v(view.target))
    let offset: Vec3 = [0, 0, 0]
    if (panelOpen && wide) offset = [dist * 0.24, 0, 0]
    else if (panelOpen) {
      // lift the subject into the strip of screen above the bottom sheet
      // (camera-controls applies a positive Y focal offset as "frame moves down, subject rises")
      const sheet = sheetCollapsed ? 0.19 : 0.5
      offset = [0, sheet * Math.tan(MathUtils.degToRad(fovFor(aspect) / 2)) * dist, 0]
    }
    moveTo(view, { offset })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, section, item, aspect, wide, panelOpen, sheetCollapsed])

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

  // ---- Share camera pose with the DOM minimap ----
  const dir = useRef(new Vector3())
  useFrame(() => {
    camera.getWorldDirection(dir.current)
    cameraState.x = camera.position.x
    cameraState.z = camera.position.z
    cameraState.yaw = Math.atan2(dir.current.x, dir.current.z)
  })

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={2.5}
      maxDistance={170}
      maxPolarAngle={Math.PI * 0.47}
      smoothTime={0.3}
      draggingSmoothTime={0.14}
      dollySpeed={0.6}
      azimuthRotateSpeed={0.6}
      polarRotateSpeed={0.5}
    />
  )
}
