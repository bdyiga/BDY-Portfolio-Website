import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, LatheGeometry, Vector2 } from 'three'
import { rugbyFunFact, trophies } from '../data/portfolio'
import { TROPHY_POS } from '../lib/sections'
import { useStore } from '../state/store'

/** Easter egg: a small trophy tucked behind the far dead-ball line. */
export function Trophy() {
  const [hover, setHover] = useState(false)
  const group = useRef<Group>(null)
  const showToast = useStore((s) => s.showToast)
  const cup = useMemo(() => {
    const pts = [
      [0, 0], [0.42, 0], [0.42, 0.08], [0.16, 0.14], [0.1, 0.5], [0.12, 0.62],
      [0.5, 0.8], [0.62, 1.3], [0.6, 1.36], [0.5, 1.32],
    ].map(([x, y]) => new Vector2(x, y))
    return new LatheGeometry(pts, 32)
  }, [])

  useFrame((state) => {
    if (!group.current) return
    group.current.rotation.y = state.clock.elapsedTime * (hover ? 1.6 : 0.4)
  })

  return (
    <group
      position={TROPHY_POS}
      onClick={(e) => {
        e.stopPropagation()
        showToast({
          tone: 'gold',
          title: 'You found the trophy cabinet',
          body: [...trophies, ...(rugbyFunFact ? [rugbyFunFact] : [])].join('\n'),
        })
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <group ref={group} scale={1.1}>
        <mesh geometry={cup}>
          <meshStandardMaterial color="#e8c35a" metalness={1} roughness={0.22} emissive="#5a4310" emissiveIntensity={hover ? 1.4 : 0.5} side={2} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.62, 1.05, 0]} rotation-z={(s * Math.PI) / 2}>
            <torusGeometry args={[0.18, 0.04, 8, 20, Math.PI]} />
            <meshStandardMaterial color="#e8c35a" metalness={1} roughness={0.22} />
          </mesh>
        ))}
      </group>
      <mesh position-y={-0.1}>
        <boxGeometry args={[0.9, 0.2, 0.9]} />
        <meshStandardMaterial color="#141917" />
      </mesh>
      {/* oversized invisible hit target so it's findable */}
      <mesh position-y={0.8}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
