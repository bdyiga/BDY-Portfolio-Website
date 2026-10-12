import { RepeatWrapping } from 'three'
import { drawPitch, drawSurround } from '../lib/textures'
import { useCanvasTexture } from './useCanvasTexture'

export function Pitch({ quality }: { quality: 'high' | 'low' }) {
  const size = quality === 'high' ? 4096 : 2048
  const pitch = useCanvasTexture(size, Math.round((size * 70) / 120), drawPitch)
  const surround = useCanvasTexture(512, 512, drawSurround)
  surround.wrapS = surround.wrapT = RepeatWrapping
  surround.repeat.set(10, 10)

  return (
    <group>
      {/* outer ground */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial map={surround} roughness={1} />
      </mesh>
      {/* playing surface incl. in-goal areas */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 70]} />
        <meshStandardMaterial map={pitch} roughness={0.92} metalness={0} />
      </mesh>
      {/* corner flags */}
      {[-60, -50, 50, 60].flatMap((x) =>
        [-35, 35].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position-y={0.8}>
              <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
              <meshStandardMaterial color="#e6e9e7" />
            </mesh>
            <mesh position={[0.22, 1.42, 0]}>
              <planeGeometry args={[0.44, 0.3]} />
              <meshStandardMaterial color="#c6ff3d" emissive="#c6ff3d" emissiveIntensity={0.6} side={2} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}
