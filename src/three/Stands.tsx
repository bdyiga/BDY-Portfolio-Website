import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Object3D } from 'three'
import { useStore } from '../state/store'

type StandSpec = {
  /** +1 = south (near), -1 = north (far) */
  side: 1 | -1
  frontZ: number
  facade: number
  rows: number
  length: number
}

const NORTH: StandSpec = { side: -1, frontZ: 41.8, facade: 10, rows: 14, length: 128 }
const SOUTH: StandSpec = { side: 1, frontZ: 48, facade: 2.6, rows: 8, length: 110 }
const ROW_RISE = 0.62
const ROW_DEPTH = 0.95

function rowTransform(spec: StandSpec, row: number) {
  const y = spec.facade + row * ROW_RISE
  const z = spec.side * (spec.frontZ + 0.6 + row * ROW_DEPTH)
  return { y, z }
}

const CROWD_COLORS = ['#2a3330', '#222a27', '#353f3b', '#0f3a24', '#174d2d', '#3d4744', '#4f5a56', '#1b2420', '#2a3330', '#0b2a1c', '#5c6763', '#8f9a97', '#c6ff3d']

function Crowd({ specs }: { specs: StandSpec[] }) {
  const ref = useRef<InstancedMesh>(null)
  const quality = useStore((s) => s.quality)
  const waveNonce = useStore((s) => s.waveNonce)
  const wave = useRef({ start: -1 })

  const seats = useMemo(() => {
    const out: { x: number; y: number; z: number; h: number }[] = []
    let seed = 42
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const step = quality === 'high' ? 0.62 : 0.95
    for (const spec of specs) {
      for (let r = 0; r < spec.rows; r++) {
        const { y, z } = rowTransform(spec, r)
        for (let x = -spec.length / 2 + 1; x < spec.length / 2 - 1; x += step) {
          if (rnd() < 0.28) continue
          out.push({ x: x + (rnd() - 0.5) * 0.15, y, z, h: 0.55 + rnd() * 0.25 })
        }
      }
    }
    return out
  }, [specs, quality])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    seats.forEach((s, i) => {
      o.position.set(s.x, s.y + s.h / 2, s.z)
      o.scale.set(1, s.h, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      const pick = rnd()
      // lime and silver supporters are rare accents, not noise
      const idx = pick > 0.985 ? CROWD_COLORS.length - 1 : pick > 0.95 ? CROWD_COLORS.length - 2 : Math.floor((pick / 0.95) * (CROWD_COLORS.length - 2))
      c.set(CROWD_COLORS[idx])
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seats])

  useEffect(() => {
    if (waveNonce > 0 && !useStore.getState().reducedMotion) wave.current.start = performance.now() / 1000
  }, [waveNonce])

  const m = useMemo(() => new Matrix4(), [])
  useFrame(() => {
    const mesh = ref.current
    const w = wave.current
    if (!mesh || w.start < 0) return
    const t = performance.now() / 1000 - w.start
    const front = -80 + t * 42
    const done = front > 90
    seats.forEach((s, i) => {
      const d = s.x - front
      const lift = done ? 0 : Math.exp(-(d * d) / 18) * 0.9
      m.makeScale(1, s.h * (1 + lift * 0.6), 1)
      m.setPosition(s.x, s.y + s.h / 2 + lift, s.z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (done) w.start = -1
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, seats.length]} key={seats.length}>
      <boxGeometry args={[0.44, 1, 0.38]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  )
}

function StandStructure({ spec }: { spec: StandSpec }) {
  const rows = Array.from({ length: spec.rows }, (_, r) => rowTransform(spec, r))
  const backZ = spec.side * (spec.frontZ + spec.rows * ROW_DEPTH + 1)
  const topY = spec.facade + spec.rows * ROW_RISE
  return (
    <group>
      {/* facade wall facing the pitch */}
      <mesh position={[0, spec.facade / 2, spec.side * spec.frontZ]}>
        <boxGeometry args={[spec.length, spec.facade, 0.6]} />
        <meshStandardMaterial color="#39413e" roughness={0.9} />
      </mesh>
      {/* lime trim along the facade top */}
      <mesh position={[0, spec.facade, spec.side * (spec.frontZ - 0.32)]}>
        <boxGeometry args={[spec.length, 0.14, 0.06]} />
        <meshStandardMaterial color="#c6ff3d" emissive="#c6ff3d" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {rows.map((r, i) => (
        <mesh key={i} position={[0, r.y - 0.2, r.z]}>
          <boxGeometry args={[spec.length, 0.4, ROW_DEPTH + 0.02]} />
          <meshStandardMaterial color={i % 2 ? '#4a524f' : '#424a47'} roughness={0.95} />
        </mesh>
      ))}
      {/* back wall */}
      <mesh position={[0, topY / 2 + 1, backZ]}>
        <boxGeometry args={[spec.length, topY + 2, 0.6]} />
        <meshStandardMaterial color="#2f3633" roughness={0.9} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * spec.length) / 2, topY / 2, (spec.side * spec.frontZ + backZ) / 2]}>
          <boxGeometry args={[0.6, topY, Math.abs(backZ - spec.side * spec.frontZ)]} />
          <meshStandardMaterial color="#343b38" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Roof() {
  const z0 = -40
  const depth = 18
  const y = 26
  return (
    <group>
      <mesh position={[0, y, z0 - depth / 2]} rotation-x={-0.06}>
        <boxGeometry args={[132, 0.5, depth]} />
        <meshStandardMaterial color="#9aa4a2" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* underside light strip */}
      <mesh position={[0, y - 0.35, z0 - 0.3]}>
        <boxGeometry args={[130, 0.12, 0.3]} />
        <meshStandardMaterial color="#e9ffd0" emissive="#e9ffd0" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {[-60, -30, 0, 30, 60].map((x) => (
        <mesh key={x} position={[x, y / 2, z0 - depth + 0.5]}>
          <cylinderGeometry args={[0.35, 0.45, y, 10]} />
          <meshStandardMaterial color="#7d8785" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function Skyline() {
  const blocks = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number }[] = []
    let seed = 99
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + rnd() * 0.05
      const r = 175 + rnd() * 50
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 8 + rnd() * 14, h: 8 + rnd() * 24, d: 8 + rnd() * 12 })
    }
    return out
  }, [])
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation-y={Math.atan2(b.x, b.z)}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#26332e" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

export function Stands() {
  const specs = useMemo(() => [NORTH, SOUTH], [])
  return (
    <group>
      <StandStructure spec={NORTH} />
      <StandStructure spec={SOUTH} />
      <Roof />
      <Crowd specs={specs} />
      <Skyline />
    </group>
  )
}
