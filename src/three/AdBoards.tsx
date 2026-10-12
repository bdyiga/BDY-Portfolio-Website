import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RepeatWrapping } from 'three'
import { drawLedBoard } from '../lib/textures'
import { useStore } from '../state/store'
import { useCanvasTexture } from './useCanvasTexture'

const MESSAGE =
  "BDY'S WORLD · ENGINEERING BEYOND THE TRY LINE · INDIANA UNIVERSITY BLOOMINGTON · AWS CERTIFIED · AI · DATA · SOFTWARE · CLASS OF 2027"

/** Scrolling LED perimeter boards around the pitch. */
export function AdBoards() {
  const reducedMotion = useStore((s) => s.reducedMotion)
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => drawLedBoard(ctx, w, h, MESSAGE)
  const sideTex = useCanvasTexture(4096, 128, draw)
  const endTex = useCanvasTexture(4096, 128, draw)
  useMemo(() => {
    sideTex.wrapS = endTex.wrapS = RepeatWrapping
    sideTex.repeat.set(1.6, 1)
    endTex.repeat.set(0.95, 1)
  }, [sideTex, endTex])

  useFrame((_, dt) => {
    if (reducedMotion) return
    sideTex.offset.x = (sideTex.offset.x + dt * 0.02) % 1
    endTex.offset.x = (endTex.offset.x + dt * 0.02) % 1
  })

  const boards: { pos: [number, number, number]; rotY: number; len: number; tex: typeof sideTex }[] = [
    { pos: [0, 0.5, -37.5], rotY: 0, len: 118, tex: sideTex },
    { pos: [0, 0.5, 37.5], rotY: Math.PI, len: 118, tex: sideTex },
    { pos: [-63, 0.5, 0], rotY: Math.PI / 2, len: 70, tex: endTex },
    { pos: [63, 0.5, 0], rotY: -Math.PI / 2, len: 70, tex: endTex },
  ]

  return (
    <group>
      {boards.map((b, i) => (
        <group key={i} position={b.pos} rotation-y={b.rotY}>
          <mesh position-z={-0.12}>
            <boxGeometry args={[b.len, 1, 0.2]} />
            <meshStandardMaterial color="#0d100f" />
          </mesh>
          <mesh position-z={0.001}>
            <planeGeometry args={[b.len, 0.9]} />
            <meshBasicMaterial map={b.tex} toneMapped={false} color="#d6d6d6" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
