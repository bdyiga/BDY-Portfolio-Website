import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { leadership, type Leadership } from '../data/portfolio'
import { bannerPosition } from '../lib/sections'
import { drawBanner } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

const BW = 3.6
const BH = 4.6

function Banner({ data, index }: { data: Leadership; index: number }) {
  const [x, y, z] = bannerPosition(index, leadership.length)
  const active = useStore((s) => s.section === 'leadership' && s.item.leadership === index)
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)
  const [hover, setHover] = useState(false)
  const tex = useCanvasTexture(
    512,
    656,
    (ctx, w, h) => drawBanner(ctx, w, h, { number: data.number, role: data.role, org: data.org, active }),
    [active],
  )
  const cloth = useRef<Group>(null)
  useFrame((state) => {
    if (!cloth.current) return
    const rm = useStore.getState().reducedMotion
    const t = state.clock.elapsedTime
    cloth.current.rotation.x = rm ? 0 : Math.sin(t * 1.3 + index) * 0.03 + (hover ? -0.08 : 0)
    const s = active ? 1.08 : hover ? 1.04 : 1
    const cur = cloth.current.scale.x
    cloth.current.scale.setScalar(cur + (s - cur) * 0.15)
  })

  return (
    <group position={[x, y + BH / 2, z]}>
      {/* hanging rail */}
      <mesh position-y={0.05}>
        <boxGeometry args={[BW + 0.4, 0.1, 0.1]} />
        <meshStandardMaterial color="#b9c2c0" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={cloth}>
        <mesh
          position-y={-BH / 2}
          onClick={(e) => {
            e.stopPropagation()
            openSection('leadership', index)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHover(true)
            setHovered('leadership')
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHover(false)
            setHovered(null)
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[BW, BH]} />
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={active ? 0.9 : hover ? 0.7 : 0.45} roughness={0.8} side={2} />
        </mesh>
      </group>
    </group>
  )
}

export function LeadershipBanners() {
  return (
    <group>
      {leadership.map((l, i) => (
        <Banner key={l.id} data={l} index={i} />
      ))}
    </group>
  )
}
