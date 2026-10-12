import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { CanvasTexture, Group, SRGBColorSpace } from 'three'
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

/** Skill chips orbiting the active tackle bag. */
function SkillOrbit({ group }: { group: SkillGroup }) {
  const ring = useRef<Group>(null)
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

  useFrame((_, dt) => {
    if (ring.current && !useStore.getState().reducedMotion) ring.current.rotation.y += dt * 0.35
  })
  const r = 3.4
  return (
    <group ref={ring} key={ready}>
      {textures.map((t, i) => {
        const a = (i / textures.length) * Math.PI * 2
        return (
          <Billboard key={i} position={[Math.cos(a) * r, 1.7 + (i % 3) * 0.75, Math.sin(a) * r]}>
            <mesh>
              <planeGeometry args={[1.9, 0.36]} />
              <meshBasicMaterial map={t} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          </Billboard>
        )
      })}
    </group>
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
              color="#c6ff3d"
              emissive="#c6ff3d"
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
      {active && <SkillOrbit group={group} />}
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
          <meshStandardMaterial color={x % 8 === 2 ? '#c6ff3d' : '#e6e9e7'} />
        </mesh>
      ))}
      {/* agility ladder */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[20 + i * 0.6, 0.03, 45.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.06, 1]} />
          <meshBasicMaterial color="#c6ff3d" />
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
