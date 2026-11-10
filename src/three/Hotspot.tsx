import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial } from 'three'
import type { SectionMeta } from '../lib/sections'
import { useStore } from '../state/store'

/** Ground ring, plus a light pillar while the zone is hovered in the rundown. The labels live in the DOM rundown. */
export function Hotspot({ meta }: { meta: SectionMeta }) {
  const ring = useRef<Mesh>(null)
  const pillar = useRef<Mesh>(null)
  const group = useRef<Group>(null)
  const hovered = useStore((s) => s.hovered === meta.id)
  const visible = useStore((s) => s.phase === 'world' && s.section === null && !s.quickView)
  const reducedMotion = useStore((s) => s.reducedMotion)

  const [hx, hy, hz] = meta.hotspot

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (ring.current) {
      const pulse = reducedMotion ? 1 : 1 + ((t * 0.6) % 1) * 0.8
      ring.current.scale.setScalar(pulse * (hovered ? 1.3 : 1))
      ;(ring.current.material as MeshBasicMaterial).opacity = reducedMotion ? 0.6 : 0.85 * (1 - ((t * 0.6) % 1))
    }
    if (group.current) {
      const target = visible ? 1 : 0
      const s = group.current.scale.x + (target - group.current.scale.x) * Math.min(1, dt * 6)
      group.current.scale.setScalar(Math.max(0.0001, s))
      group.current.visible = s > 0.02
    }
    if (pillar.current) (pillar.current.material as MeshBasicMaterial).opacity = hovered ? 0.55 : 0
  })

  const ground = meta.id === 'leadership' || meta.id === 'contact' ? null : [hx, 0.06, hz]

  return (
    <group>
      <group ref={group}>
        {ground && (
          <mesh ref={ring} position={ground as [number, number, number]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[1.2, 1.45, 48]} />
            <meshBasicMaterial color="#c6ff3d" transparent depthWrite={false} toneMapped={false} />
          </mesh>
        )}
        {ground && (
          <mesh ref={pillar} position={[hx, hy / 2, hz]}>
            <cylinderGeometry args={[0.05, 0.05, hy, 6, 1, true]} />
            <meshBasicMaterial color="#c6ff3d" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}
