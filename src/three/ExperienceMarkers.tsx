import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh } from 'three'
import { experiences, type Experience } from '../data/portfolio'
import { experienceMarkerPosition } from '../lib/sections'
import { drawTotem } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

const TW = 2.6
const TH = 6.4

function Totem({ exp, index }: { exp: Experience; index: number }) {
  const [x, , z] = experienceMarkerPosition(index, experiences.length)
  const active = useStore((s) => s.section === 'experience' && s.item.experience === index)
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)
  const [hover, setHover] = useState(false)
  const tex = useCanvasTexture(
    512,
    1260,
    (ctx, w, h) =>
      drawTotem(ctx, w, h, {
        year: exp.year,
        name: exp.shortName,
        role: exp.role,
        dates: `${exp.start} – ${exp.end}`,
        index,
        active,
      }),
    [active],
  )
  const group = useRef<Group>(null)
  useFrame((_, dt) => {
    if (!group.current) return
    const target = active ? 1.4 : hover ? 0.7 : 0
    group.current.position.y += (target - group.current.position.y) * Math.min(1, dt * 6)
  })

  return (
    <group position={[x, 0, z]}>
      {/* plinth */}
      <mesh position-y={0.25}>
        <boxGeometry args={[1.6, 0.5, TW + 0.8]} />
        <meshStandardMaterial color="#141917" metalness={0.5} roughness={0.5} />
      </mesh>
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation()
          openSection('experience', index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          setHovered('experience')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          setHovered(null)
          document.body.style.cursor = ''
        }}
      >
        <mesh position-y={0.5 + TH / 2}>
          <boxGeometry args={[0.6, TH, TW]} />
          <meshStandardMaterial color="#1a201e" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* screen faces the field (-X) */}
        <mesh position={[-0.31, 0.5 + TH / 2, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[TW - 0.2, TH - 0.2]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position-y={0.5 + TH + 0.08}>
          <boxGeometry args={[0.62, 0.16, TW]} />
          <meshStandardMaterial
            color="#c6ff3d"
            emissive="#c6ff3d"
            emissiveIntensity={active ? 3 : hover ? 2 : 0.8}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}

/** Glowing "match clock" rail connecting the totems; fills up to the selected period. */
function ProgressRail() {
  const first = experienceMarkerPosition(0, experiences.length)
  const last = experienceMarkerPosition(experiences.length - 1, experiences.length)
  const len = last[2] - first[2]
  const fill = useRef<Mesh>(null)
  useFrame((_, dt) => {
    const { section, item } = useStore.getState()
    const idx = section === 'experience' ? (item.experience ?? experiences.length - 1) : experiences.length - 1
    const zSel = experienceMarkerPosition(idx, experiences.length)[2]
    const target = Math.max(0.001, (zSel - first[2]) / len)
    if (fill.current) {
      const cur = fill.current.scale.z
      const s = cur + (target - cur) * Math.min(1, dt * 4)
      fill.current.scale.z = s
      fill.current.position.z = first[2] + (len * s) / 2
    }
  })
  return (
    <group position={[first[0] - 2.2, 0.06, 0]}>
      <mesh position-z={(first[2] + last[2]) / 2}>
        <boxGeometry args={[0.35, 0.04, len]} />
        <meshBasicMaterial color="#1d3a2a" />
      </mesh>
      <mesh ref={fill} position-y={0.01}>
        <boxGeometry args={[0.35, 0.05, len]} />
        <meshBasicMaterial color="#c6ff3d" toneMapped={false} />
      </mesh>
    </group>
  )
}

export function ExperienceMarkers() {
  return (
    <group>
      {experiences.map((e, i) => (
        <Totem key={e.id} exp={e} index={i} />
      ))}
      <ProgressRail />
    </group>
  )
}
