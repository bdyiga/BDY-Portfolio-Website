import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, LatheGeometry, Mesh, Quaternion, Vector2, Vector3 } from 'three'
import { ball, bounceBall, flyBall } from '../lib/sceneState'
import { player } from '../lib/player'
import { drawBall } from '../lib/textures'
import { useCanvasTexture } from './useCanvasTexture'
import { useStore } from '../state/store'
import { SECTION_BY_ID } from '../lib/sections'

const LENGTH = 1.15
const RADIUS = 0.36
const UP = new Vector3(0, 1, 0)
/** Rotates the ball's long axis (local Y) to point forward (+Z). */
const CARRY_TILT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)

function ballGeometry() {
  const pts: Vector2[] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const y = -LENGTH / 2 + (LENGTH * i) / n
    const k = 1 - Math.pow((2 * y) / LENGTH, 2)
    // slightly pointed tips: exponent < 0.5 on a spheroid profile
    const r = RADIUS * Math.pow(Math.max(0, k), 0.62)
    pts.push(new Vector2(Math.max(r, i === 0 || i === n ? 0 : 0.002), y))
  }
  const g = new LatheGeometry(pts, 48)
  g.computeVertexNormals()
  return g
}

const tmpQ = new Quaternion()
const tmpV = new Vector3()
const tmpAxis = new Vector3()

export function RugbyBall() {
  const group = useRef<Group>(null)
  const mesh = useRef<Mesh>(null)
  const shadow = useRef<Mesh>(null)
  const tee = useRef<Mesh>(null)
  const geometry = useMemo(ballGeometry, [])
  const map = useCanvasTexture(1024, 1024, drawBall)
  const state = useRef({
    q: new Quaternion(),
    prev: ball.pos.clone(),
    spinAngle: 0,
    hop: 0,
    lastHovered: null as string | null,
    flightAxis: new Vector3(0, 1, 0),
  })

  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)

  useFrame((frame, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const s = state.current
    const { hovered, reducedMotion, phase } = useStore.getState()
    const t = frame.clock.elapsedTime

    if (ball.mode === 'physics') {
      ball.vel.y -= 18 * dt
      ball.pos.addScaledVector(ball.vel, dt)
      tmpQ.setFromAxisAngle(tmpAxis.copy(ball.angVel).normalize(), ball.angVel.length() * dt)
      s.q.premultiply(tmpQ)
      if (ball.pos.y < RADIUS) {
        ball.pos.y = RADIUS
        ball.bounces++
        // rugby balls kick off at odd angles when they land
        ball.vel.set((Math.random() - 0.5) * 6, Math.abs(ball.vel.y) * 0.5, (Math.random() - 0.5) * 6)
        ball.angVel.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 16)
        if (ball.bounces > 3 || ball.vel.y < 1.2) {
          ball.mode = 'idle'
          flyBall(ball.rest, { height: 1.2, duration: 0.7 })
        }
      }
    } else if (ball.mode === 'carried') {
      // tucked in both hands, long axis pointing the way #13 is facing
      tmpQ.setFromAxisAngle(UP, player.yaw).multiply(CARRY_TILT)
      s.q.slerp(tmpQ, Math.min(1, dt * 10))
    } else if (ball.mode === 'flight') {
      tmpV.copy(ball.pos).sub(s.prev)
      if (ball.style === 'spiral') {
        // long axis follows travel direction, spinning around it
        if (tmpV.lengthSq() > 1e-6) s.flightAxis.copy(tmpV).normalize()
        s.spinAngle += dt * 22
        tmpQ.setFromUnitVectors(UP, s.flightAxis)
        s.q.copy(tmpQ).multiply(new Quaternion().setFromAxisAngle(UP, s.spinAngle))
      } else {
        // end-over-end, like a place kick
        tmpAxis.copy(ball.dir).cross(UP).normalize()
        s.spinAngle += dt * 11
        s.q.setFromAxisAngle(tmpAxis, s.spinAngle)
      }
    } else {
      // idle: hover, slow turn, and lean toward whatever hotspot is hovered
      let lean = 0.22
      let yaw = reducedMotion ? 0.6 : t * 0.35
      if (hovered && hovered !== 'about' && phase === 'world') {
        const hp = SECTION_BY_ID[hovered].hotspot
        yaw = Math.atan2(hp[0] - ball.pos.x, hp[2] - ball.pos.z)
        lean = 0.55
      }
      if (hovered !== s.lastHovered) {
        if (hovered && !reducedMotion) s.hop = 1
        s.lastHovered = hovered
      }
      tmpQ.setFromAxisAngle(UP, yaw)
      const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), lean)
      tmpQ.multiply(tilt)
      s.q.slerp(tmpQ, Math.min(1, dt * 4))
    }
    s.prev.copy(ball.pos)

    if (group.current) {
      s.hop = Math.max(0, s.hop - dt * 2.2)
      const bob = ball.mode === 'idle' && !reducedMotion ? Math.sin(t * 1.8) * 0.05 + Math.sin(s.hop * Math.PI) * 0.45 : 0
      group.current.position.set(ball.pos.x, ball.pos.y + bob, ball.pos.z)
      // a touch smaller in his hands so the hero ball doesn't swamp the player
      const sc = group.current.scale.x + ((ball.mode === 'carried' ? 0.78 : 1) - group.current.scale.x) * Math.min(1, dt * 8)
      group.current.scale.setScalar(sc)
    }
    if (mesh.current) mesh.current.quaternion.copy(s.q)
    if (shadow.current) {
      const h = Math.max(0, ball.pos.y - RADIUS)
      shadow.current.position.set(ball.pos.x, 0.03, ball.pos.z)
      const k = 1 / (1 + h * 0.18)
      shadow.current.scale.setScalar(k)
      ;(shadow.current.material as { opacity: number }).opacity = 0.45 * k
    }
    if (tee.current) tee.current.visible = ball.pos.distanceTo(ball.home) < 0.6 && ball.mode === 'idle'
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const st = useStore.getState()
    if (st.phase !== 'world') return
    if (st.section === 'about' || ball.pos.distanceTo(ball.home) > 1) {
      // Easter egg: rugby balls never bounce the way you expect
      if (ball.mode === 'idle' && !st.reducedMotion) {
        bounceBall()
        st.showToast({ title: 'Unpredictable bounce', body: 'Like a good bug report, a rugby ball never lands where you expect.' })
      }
      return
    }
    openSection('about')
  }

  return (
    <>
      <group ref={group}>
        <mesh
          ref={mesh}
          geometry={geometry}
          castShadow
          onClick={onClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered('about')
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(null)
            document.body.style.cursor = ''
          }}
        >
          <meshStandardMaterial map={map} roughness={0.55} metalness={0.05} />
        </mesh>
      </group>
      {/* kicking tee */}
      <mesh ref={tee} position={[ball.home.x, 0.12, ball.home.z]}>
        <cylinderGeometry args={[0.12, 0.26, 0.24, 20, 1, true]} />
        <meshStandardMaterial color="#c6ff3d" emissive="#c6ff3d" emissiveIntensity={0.4} side={2} />
      </mesh>
      {/* blob shadow */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </>
  )
}
