import { useEffect, useState } from 'react'
import { highlights } from '../data/portfolio'
import { drawScoreboard } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

/** Giant screen on the north stand roof. Cycles career highlights; click for the next one. */
export function Scoreboard() {
  const [index, setIndex] = useState(0)
  const conversions = useStore((s) => s.conversions)
  const reducedMotion = useStore((s) => s.reducedMotion)
  const h = highlights[index]
  const tex = useCanvasTexture(
    1024,
    384,
    (ctx, w, hh) => drawScoreboard(ctx, w, hh, { ...h, index, total: highlights.length, conversions }),
    [index, conversions],
  )

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % highlights.length), 4200)
    return () => window.clearInterval(id)
  }, [reducedMotion, index])

  return (
    <group position={[0, 31.5, -41]}>
      {/* frame */}
      <mesh position-z={-0.5}>
        <boxGeometry args={[23, 9.4, 0.8]} />
        <meshStandardMaterial color="#1a1f1d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh
        position-z={-0.05}
        onClick={(e) => {
          e.stopPropagation()
          setIndex((i) => (i + 1) % highlights.length)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <planeGeometry args={[22, 8.25]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* legs down to the roof */}
      {[-8, 8].map((x) => (
        <mesh key={x} position={[x, -6, -0.6]}>
          <boxGeometry args={[0.6, 4, 0.6]} />
          <meshStandardMaterial color="#59625f" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
