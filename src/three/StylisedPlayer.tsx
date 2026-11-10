import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Group, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { player, playAction, yawTo } from '../lib/player'
import { ACTIONS, IDLE, KEYS, sample, wrapAngle } from '../lib/poses'
import { ball } from '../lib/sceneState'
import { SECTION_BY_ID } from '../lib/sections'
import { drawJersey, drawShorts, IU } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

const HIP_Y = 1.61
const SKIN = '#6b4226'
const carry = new Vector3()
const HAIR = '#140e0b'

function useMats() {
  const jersey = useCanvasTexture(1024, 512, drawJersey)
  const shorts = useCanvasTexture(256, 128, drawShorts)
  return useMemo(
    () => ({
      jersey: new MeshStandardMaterial({ map: jersey, roughness: 0.75 }),
      shorts: new MeshStandardMaterial({ map: shorts, roughness: 0.8 }),
      crimson: new MeshStandardMaterial({ color: IU.crimson, roughness: 0.75 }),
      cream: new MeshStandardMaterial({ color: IU.cream, roughness: 0.8 }),
      skin: new MeshStandardMaterial({ color: SKIN, roughness: 0.6 }),
      hair: new MeshStandardMaterial({ color: HAIR, roughness: 0.95 }),
      boot: new MeshStandardMaterial({ color: '#121212', roughness: 0.4, metalness: 0.2 }),
    }),
    [jersey, shorts],
  )
}

type Mats = ReturnType<typeof useMats>

function Arm({ side, mats, shoulder, elbow }: { side: 1 | -1; mats: Mats; shoulder: React.RefObject<Group | null>; elbow: React.RefObject<Group | null> }) {
  return (
    <group ref={shoulder} position={[side * 0.58, 0.98, 0]}>
      <mesh material={mats.crimson}>
        <sphereGeometry args={[0.17, 16, 12]} />
      </mesh>
      {/* sleeve + upper arm */}
      <mesh position-y={-0.27} material={mats.crimson}>
        <capsuleGeometry args={[0.14, 0.36, 6, 14]} />
      </mesh>
      <mesh position-y={-0.5} material={mats.cream}>
        <cylinderGeometry args={[0.145, 0.145, 0.06, 14]} />
      </mesh>
      <group ref={elbow} position-y={-0.58}>
        <mesh position-y={-0.22} material={mats.skin}>
          <capsuleGeometry args={[0.11, 0.34, 6, 12]} />
        </mesh>
        <mesh position-y={-0.5} material={mats.skin}>
          <sphereGeometry args={[0.12, 12, 10]} />
        </mesh>
      </group>
    </group>
  )
}

function Leg({ side, mats, hip, knee }: { side: 1 | -1; mats: Mats; hip: React.RefObject<Group | null>; knee: React.RefObject<Group | null> }) {
  return (
    <group ref={hip} position={[side * 0.21, 0, 0]}>
      {/* shorts */}
      <mesh position-y={-0.18} material={mats.shorts}>
        <cylinderGeometry args={[0.22, 0.2, 0.42, 16]} />
      </mesh>
      <mesh position-y={-0.5} material={mats.skin}>
        <capsuleGeometry args={[0.15, 0.32, 6, 12]} />
      </mesh>
      <group ref={knee} position-y={-0.75}>
        {/* sock with cream hoops */}
        <mesh position-y={-0.34} material={mats.crimson}>
          <capsuleGeometry args={[0.135, 0.5, 6, 12]} />
        </mesh>
        {[-0.12, -0.24].map((y) => (
          <mesh key={y} position-y={y} material={mats.cream}>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 12]} />
          </mesh>
        ))}
        {/* boot */}
        <mesh position={[0, -0.78, 0.08]} material={mats.boot}>
          <boxGeometry args={[0.24, 0.16, 0.44]} />
        </mesh>
      </group>
    </group>
  )
}

/** The code-only #13: shown while the rigged athlete loads, and if it cannot load. */
export function StylisedPlayer() {
  const mats = useMats()
  // on high the floodlights cast his real shadows; the blob stays as soft contact shading
  const quality = useStore((s) => s.quality)
  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const head = useRef<Group>(null)
  const lSh = useRef<Group>(null)
  const rSh = useRef<Group>(null)
  const lEl = useRef<Group>(null)
  const rEl = useRef<Group>(null)
  const lHip = useRef<Group>(null)
  const rHip = useRef<Group>(null)
  const lKnee = useRef<Group>(null)
  const rKnee = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const state = useRef({ phase: 0, cur: { ...IDLE }, target: { ...IDLE }, prev: player.pos.clone() })

  // floodlight shadows (high quality only; the lights decide whether they cast)
  useEffect(() => {
    root.current?.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = true
    })
  }, [])

  useFrame((frame, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const s = state.current
    const t = frame.clock.elapsedTime
    const { reducedMotion, hovered, phase } = useStore.getState()
    const target = s.target

    if (player.mode === 'run') {
      s.phase += dt * (9 + player.speed * 0.35)
      const sp = Math.sin(s.phase)
      const sk = Math.sin(s.phase + 0.5)
      Object.assign(target, IDLE, {
        lHip: 0.8 * sp,
        rHip: -0.8 * sp,
        lKnee: 0.3 + 0.9 * (0.5 - 0.5 * sk),
        rKnee: 0.3 + 0.9 * (0.5 + 0.5 * sk),
        lShX: -0.75 * sp,
        rShX: 0.75 * sp,
        lEl: 1.3,
        rEl: 1.3,
        lShZ: 0.12,
        rShZ: 0.12,
        lean: 0.28,
        bob: 0.13 * Math.abs(Math.cos(s.phase)) - 0.06,
      })
    } else if (player.mode === 'action' && player.action) {
      sample(ACTIONS[player.action], player.actionT, target)
      if (player.action === 'wave' && player.actionT > 0.15 && player.actionT < 0.85) target.rEl += 0.45 * Math.sin(t * 16)
    } else {
      Object.assign(target, IDLE)
      if (!reducedMotion) {
        target.bob = Math.sin(t * 2.1) * 0.015
        target.lean = IDLE.lean + Math.sin(t * 2.1) * 0.012
      }
      // glance at whichever hotspot the visitor is hovering
      if (hovered && phase === 'world') {
        const diff = MathUtils.clamp(wrapAngle(yawTo(player.pos, SECTION_BY_ID[hovered].hotspot) - player.yaw), -1.1, 1.1)
        target.twist = diff * 0.45
        target.head = diff * 0.5
      }
    }

    // carrying: both hands hold the ball in front of the chest (actions animate their own arms)
    if (ball.mode === 'carried' && player.mode !== 'action') {
      Object.assign(target, { lShX: 0.9, rShX: 0.9, lEl: 1.5, rEl: 1.5, lShZ: 0.05, rShZ: 0.05 })
    }

    // ease toward the target pose so mode changes blend instead of snapping
    const k = 1 - Math.exp(-dt * 14)
    for (const key of KEYS) s.cur[key] += (target[key] - s.cur[key]) * k
    const p = s.cur

    player.yaw += wrapAngle(player.targetYaw - player.yaw) * Math.min(1, dt * 9)

    if (root.current) {
      root.current.position.set(player.pos.x, 0, player.pos.z)
      root.current.rotation.y = player.yaw
    }
    if (hips.current) hips.current.position.y = HIP_Y + p.bob
    if (torso.current) {
      torso.current.rotation.x = p.lean
      torso.current.rotation.y = p.twist
    }
    if (head.current) head.current.rotation.y = p.head
    if (lSh.current) lSh.current.rotation.set(-p.lShX, 0, p.lShZ)
    if (rSh.current) rSh.current.rotation.set(-p.rShX, 0, -p.rShZ)
    if (lEl.current) lEl.current.rotation.x = -p.lEl
    if (rEl.current) rEl.current.rotation.x = -p.rEl
    if (lHip.current) lHip.current.rotation.x = -p.lHip
    if (rHip.current) rHip.current.rotation.x = -p.rHip
    if (lKnee.current) lKnee.current.rotation.x = p.lKnee
    if (rKnee.current) rKnee.current.rotation.x = p.rKnee
    if (shadow.current) shadow.current.position.set(player.pos.x, 0.025, player.pos.z)

    // keep a carried ball in his hands: travel with him, then settle into the grip
    if (ball.mode === 'carried') {
      ball.pos.x += player.pos.x - s.prev.x
      ball.pos.z += player.pos.z - s.prev.z
      const yaw = player.yaw + p.twist
      const reach = 0.62 + p.lean * 0.6
      carry.set(
        player.pos.x + Math.sin(yaw) * reach,
        HIP_Y + p.bob + 0.62 - p.lean * 0.5,
        player.pos.z + Math.cos(yaw) * reach,
      )
      ball.pos.lerp(carry, 1 - Math.exp(-dt * 16))
    }
    s.prev.copy(player.pos)
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const st = useStore.getState()
    if (st.phase !== 'world' || player.mode !== 'idle') return
    playAction('wave', { instant: st.reducedMotion })
    st.showToast({ title: '#13 says hi', body: 'Thanks for stopping by the stadium. Pick a zone in the rundown and I will run you there.' })
  }

  return (
    <>
      <group
        ref={root}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <group ref={hips} position-y={HIP_Y}>
          <Leg side={1} mats={mats} hip={lHip} knee={lKnee} />
          <Leg side={-1} mats={mats} hip={rHip} knee={rKnee} />
          <group ref={torso} position-y={0.05}>
            {/* jersey: u=0 faces forward (+Z), u=0.5 is the back with YIGA 13 */}
            <mesh position-y={0.6} material={mats.jersey}>
              <cylinderGeometry args={[0.52, 0.42, 1.05, 28, 1, true]} />
            </mesh>
            {/* plain yoke over the shoulders + cream collar (keeps the print off the top cap) */}
            <mesh position-y={1.125} material={mats.crimson}>
              <cylinderGeometry args={[0.36, 0.52, 0.06, 28]} />
            </mesh>
            <mesh position-y={1.16} rotation-x={Math.PI / 2} material={mats.cream}>
              <torusGeometry args={[0.16, 0.035, 8, 20]} />
            </mesh>
            <mesh position-y={0.075} material={mats.shorts}>
              <cylinderGeometry args={[0.42, 0.42, 0.02, 28]} />
            </mesh>
            <Arm side={1} mats={mats} shoulder={lSh} elbow={lEl} />
            <Arm side={-1} mats={mats} shoulder={rSh} elbow={rEl} />
            <mesh position-y={1.18} material={mats.skin}>
              <cylinderGeometry args={[0.13, 0.15, 0.2, 12]} />
            </mesh>
            <group ref={head} position-y={1.5}>
              <mesh scale={[0.92, 1.06, 0.98]} material={mats.skin}>
                <sphereGeometry args={[0.3, 24, 18]} />
              </mesh>
              {/* short hair */}
              <mesh position-y={0.04} scale={[0.94, 1.0, 1.0]} material={mats.hair}>
                <sphereGeometry args={[0.305, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {/* blob shadow */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.75, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={quality === 'high' ? 0.16 : 0.35} depthWrite={false} />
      </mesh>
    </>
  )
}
