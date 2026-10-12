import { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../state/store'

const POST_GAP = 5.6
const CROSSBAR = 3
const HEIGHT = 16

/** H-shaped posts with padded bases. The right-hand set doubles as the Contact hotspot. */
export function Goalposts({ x, interactive = false }: { x: number; interactive?: boolean }) {
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)
  const [hover, setHover] = useState(false)
  const glow = useMemo(
    () => new MeshStandardMaterial({ color: '#c6ff3d', emissive: '#c6ff3d', emissiveIntensity: 0.4 }),
    [],
  )

  useFrame((_, dt) => {
    const target = hover ? 3 : interactive ? 0.9 : 0.25
    glow.emissiveIntensity += (target - glow.emissiveIntensity) * Math.min(1, dt * 8)
  })

  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          openSection('contact')
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(true)
          setHovered('contact')
          document.body.style.cursor = 'pointer'
        },
        onPointerOut: () => {
          setHover(false)
          setHovered(null)
          document.body.style.cursor = ''
        },
      }
    : {}

  return (
    <group position={[x, 0, 0]} {...handlers}>
      {[-POST_GAP / 2, POST_GAP / 2].map((z) => (
        <group key={z} position-z={z}>
          <mesh position-y={HEIGHT / 2}>
            <cylinderGeometry args={[0.09, 0.11, HEIGHT, 12]} />
            <meshStandardMaterial color="#eef1ef" metalness={0.4} roughness={0.35} />
          </mesh>
          {/* thin light strip up each upright: hover feedback */}
          <mesh position={[x > 0 ? -0.11 : 0.11, CROSSBAR + (HEIGHT - CROSSBAR) / 2, 0]} material={glow}>
            <boxGeometry args={[0.04, HEIGHT - CROSSBAR - 0.4, 0.06]} />
          </mesh>
          {/* post protector pad */}
          <mesh position-y={1}>
            <cylinderGeometry args={[0.38, 0.38, 2, 16]} />
            <meshStandardMaterial color="#0b2a1c" roughness={0.7} />
          </mesh>
          <mesh position-y={1.6} material={glow}>
            <cylinderGeometry args={[0.39, 0.39, 0.18, 16]} />
          </mesh>
        </group>
      ))}
      <mesh position-y={CROSSBAR} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.08, 0.08, POST_GAP, 10]} />
        <meshStandardMaterial color="#eef1ef" metalness={0.4} roughness={0.35} />
      </mesh>
      {interactive && (
        // generous transparent hit area so the posts are easy to click
        <mesh position-y={HEIGHT / 2}>
          <boxGeometry args={[2.5, HEIGHT, POST_GAP + 2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

export const POSTS = { gap: POST_GAP, crossbar: CROSSBAR, height: HEIGHT }
