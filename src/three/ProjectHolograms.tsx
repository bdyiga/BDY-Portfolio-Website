import { useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, Group, MeshBasicMaterial } from 'three'
import { projects, type Project } from '../data/portfolio'
import { projectCardTransform } from '../lib/sections'
import { drawCard } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

const W = 6.4
const H = 4

function Card({ project, index }: { project: Project; index: number }) {
  const { position, rotationY } = projectCardTransform(index, projects.length)
  const tex = useCanvasTexture(1024, 640, (ctx, w, h) =>
    drawCard(ctx, w, h, { index, title: project.title, play: project.play, short: project.short, tags: project.tags, badge: project.badge }),
  )
  const group = useRef<Group>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  const beam = useRef<MeshBasicMaterial>(null)
  const [hover, setHover] = useState(false)
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)

  useFrame((state, dt) => {
    const { section, item, reducedMotion } = useStore.getState()
    const selected = section === 'projects' && item.projects === index
    const dimmed = section === 'projects' && item.projects !== null && !selected
    const t = state.clock.elapsedTime
    if (group.current) {
      const s = selected ? 1.12 : hover ? 1.06 : 1
      const cur = group.current.scale.x
      group.current.scale.setScalar(cur + (s - cur) * Math.min(1, dt * 8))
      group.current.position.y = position[1] + (reducedMotion ? 0 : Math.sin(t * 1.1 + index) * 0.18)
    }
    if (mat.current) {
      const o = dimmed ? 0.35 : 0.95
      mat.current.opacity += (o - mat.current.opacity) * Math.min(1, dt * 6)
    }
    if (beam.current) beam.current.opacity = selected || hover ? 0.22 : 0.12
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    openSection('projects', index)
  }

  return (
    <group position={[position[0], 0, position[2]]} rotation-y={rotationY}>
      {/* projector base */}
      <mesh position-y={0.1}>
        <cylinderGeometry args={[0.7, 0.9, 0.2, 24]} />
        <meshStandardMaterial color="#1c2220" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position-y={0.21} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.35, 0.6, 32]} />
        <meshBasicMaterial color="#c6ff3d" toneMapped={false} />
      </mesh>
      <mesh position-y={(position[1] - H / 2) / 2 + 0.2}>
        <cylinderGeometry args={[W * 0.36, 0.5, position[1] - H / 2, 4, 1, true]} />
        <meshBasicMaterial ref={beam} color="#c6ff3d" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} side={2} toneMapped={false} />
      </mesh>
      <group
        ref={group}
        position-y={position[1]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          setHovered('projects')
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          setHovered(null)
          document.body.style.cursor = ''
        }}
      >
        <mesh>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial ref={mat} map={tex} transparent opacity={0.95} toneMapped={false} depthWrite={false} side={2} />
        </mesh>
      </group>
    </group>
  )
}

export function ProjectHolograms() {
  return (
    <group>
      {projects.map((p, i) => (
        <Card key={p.id} project={p} index={i} />
      ))}
    </group>
  )
}
