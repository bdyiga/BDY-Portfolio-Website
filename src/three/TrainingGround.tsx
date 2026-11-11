import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { CanvasTexture, Group, MathUtils, SRGBColorSpace } from 'three'
import { skillGroups, type SkillGroup } from '../data/portfolio'
import { bagPosition } from '../lib/sections'
import { drawChip } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

function chipTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 96
  const ctx = c.getContext('2d')!
  drawChip(ctx, 512, 96, text)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const CHIP_W = 2.4
const CHIP_H = 0.45
const PER_ROW = 3

/**
 * Skill chips stacked in rows above the active bag's label, facing the camera.
 * Flat rows rather than a ring, so no chip ever passes in front of another or a label.
 */
function SkillRows({ group }: { group: SkillGroup }) {
  const chips = useRef<(Group | null)[]>([])
  const age = useRef(0)
  const textures = useMemo(() => group.skills.map(chipTexture), [group])
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures])
  const [ready, setReady] = useState(0)
  useEffect(() => {
    document.fonts?.ready.then(() => {
      textures.forEach((t, i) => {
        drawChip((t.image as HTMLCanvasElement).getContext('2d')!, 512, 96, group.skills[i])
        t.needsUpdate = true
      })
      setReady((r) => r + 1)
    })
  }, [textures, group])

  // pop in one after another, then bob gently
  useFrame((state, dt) => {
    age.current += dt
    const rm = useStore.getState().reducedMotion
    chips.current.forEach((c, i) => {
      if (!c) return
      const k = rm ? 1 : MathUtils.clamp((age.current - i * 0.06) / 0.25, 0, 1)
      c.scale.setScalar(k * k * (3 - 2 * k))
      c.position.y = c.userData.y + (rm ? 0 : Math.sin(state.clock.elapsedTime * 1.6 + i) * 0.04)
    })
  })
  const rows = Math.ceil(textures.length / PER_ROW)
  return (
    <Billboard position-y={4.15} key={ready}>
      {textures.map((t, i) => {
        const row = Math.floor(i / PER_ROW)
        const inRow = Math.min(PER_ROW, textures.length - row * PER_ROW)
        const x = (i % PER_ROW - (inRow - 1) / 2) * (CHIP_W + 0.12)
        const y = (rows - 1 - row) * (CHIP_H + 0.1)
        return (
          <group key={i} ref={(g) => { chips.current[i] = g }} position={[x, y, 0]} userData={{ y }} scale={0}>
            <mesh>
              <planeGeometry args={[CHIP_W, CHIP_H]} />
              <meshBasicMaterial map={t} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
    </Billboard>
  )
}

function TackleBag({ group, index }: { group: SkillGroup; index: number }) {
  const [x, , z] = bagPosition(index, skillGroups.length)
  const active = useStore((s) => s.section === 'skills' && s.item.skills === index)
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)
  const [hover, setHover] = useState(false)
  const bag = useRef<Group>(null)
  const hit = useRef({ t: 10 })
  const label = useCanvasTexture(512, 96, (ctx, w, h) => drawChip(ctx, w, h, group.name.toUpperCase()))

  useEffect(() => {
    if (active) hit.current.t = 0
  }, [active])

  useFrame((_, dt) => {
    hit.current.t += dt
    if (!bag.current) return
    const rm = useStore.getState().reducedMotion
    const t = hit.current.t
    // damped "tackled" wobble around the base
    bag.current.rotation.x = rm ? 0 : Math.exp(-t * 3) * Math.sin(t * 14) * 0.45
    bag.current.rotation.z = rm ? 0 : Math.exp(-t * 3) * Math.cos(t * 11) * 0.12
  })

  return (
    <group position={[x, 0, z]}>
      <group
        ref={bag}
        onClick={(e) => {
          e.stopPropagation()
          hit.current.t = 0
          openSection('skills', index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          setHovered('skills')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          setHovered(null)
          document.body.style.cursor = ''
        }}
      >
        <mesh position-y={1}>
          <cylinderGeometry args={[0.5, 0.55, 1.9, 20]} />
          <meshStandardMaterial color={active ? '#145233' : '#0b2a1c'} roughness={0.8} />
        </mesh>
        {[0.45, 1.55].map((y) => (
          <mesh key={y} position-y={y}>
            <cylinderGeometry args={[0.56, 0.56, 0.14, 20]} />
            <meshStandardMaterial
              color="#eeedeb"
              emissive="#eeedeb"
              emissiveIntensity={active ? 2.5 : hover ? 1.6 : 0.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <Billboard position-y={3.4}>
        <mesh>
          <planeGeometry args={[3.4, 0.64]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </Billboard>
      {active && <SkillRows group={group} />}
    </group>
  )
}

function Cones() {
  const cones = useMemo(() => Array.from({ length: 12 }, (_, i) => -22 + i * 4), [])
  return (
    <group>
      {cones.map((x) => (
        <mesh key={x} position={[x, 0.2, 38.8]}>
          <coneGeometry args={[0.18, 0.4, 12]} />
          <meshStandardMaterial color={x % 8 === 2 ? '#eeedeb' : '#e6e9e7'} />
        </mesh>
      ))}
      {/* agility ladder */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[20 + i * 0.6, 0.03, 45.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.06, 1]} />
          <meshBasicMaterial color="#eeedeb" />
        </mesh>
      ))}
    </group>
  )
}

export function TrainingGround() {
  return (
    <group>
      {/* training turf pad */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 42]}>
        <planeGeometry args={[46, 8.5]} />
        <meshStandardMaterial color="#163f28" roughness={1} />
      </mesh>
      {skillGroups.map((g, i) => (
        <TackleBag key={g.id} group={g} index={i} />
      ))}
      <Cones />
    </group>
  )
}
