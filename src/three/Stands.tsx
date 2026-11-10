import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
} from 'three'
import { useStore } from '../state/store'
import type { Vec3 } from '../lib/sections'

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
const SPECS = [NORTH, SOUTH]
const ROW_RISE = 0.62
const ROW_DEPTH = 0.95
const RAKE = Math.atan2(ROW_RISE, ROW_DEPTH)

/** Structural grid: a pier every bay, a stairway every second bay. The leadership banners hang mid-bay. */
const BAY = 7.2
const AISLE_WIDTH = 1.3
const VOMITORY = { firstRow: 4, rows: 4, halfWidth: 1.8, reach: 3 }

function rowTransform(spec: StandSpec, row: number) {
  const y = spec.facade + row * ROW_RISE
  const z = spec.side * (spec.frontZ + 0.6 + row * ROW_DEPTH)
  return { y, z }
}
const backOf = (spec: StandSpec) => spec.side * (spec.frontZ + spec.rows * ROW_DEPTH + 1)
const topOf = (spec: StandSpec) => spec.facade + spec.rows * ROW_RISE

/** Stairways run up the stand between seating blocks. */
function aisles(spec: StandSpec) {
  const out: number[] = []
  for (let x = BAY; x < spec.length / 2 - 2; x += BAY * 2) out.push(-x, x)
  return out
}
/** Tunnel mouths in the north stand, one in the middle of each central block. */
function vomitories(spec: StandSpec) {
  if (spec.side !== -1) return []
  return Array.from({ length: VOMITORY.reach * 2 + 1 }, (_, i) => (i - VOMITORY.reach) * BAY * 2)
}
function seatFree(spec: StandSpec, row: number, x: number) {
  if (aisles(spec).some((a) => Math.abs(x - a) < AISLE_WIDTH / 2 + 0.1)) return false
  if (row >= VOMITORY.firstRow && row < VOMITORY.firstRow + VOMITORY.rows)
    return !vomitories(spec).some((v) => Math.abs(x - v) < VOMITORY.halfWidth + 0.25)
  return true
}

function lcg(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

// ---------- instanced boxes: the whole structure in a handful of draw calls ----------

type Box = { p: Vec3; s: Vec3; rx?: number; c: string }

function Boxes({ items, children }: { items: Box[]; children: ReactNode }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    items.forEach((b, i) => {
      o.position.set(...b.p)
      o.rotation.set(b.rx ?? 0, 0, 0)
      o.scale.set(...b.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(b.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      <boxGeometry />
      {children}
    </instancedMesh>
  )
}

// ---------- crowd ----------

const SHIRTS = ['#3a4541', '#2c3632', '#4a5651', '#1c4a31', '#5a6661', '#6d7975', '#2a3330', '#3f4a46', '#7d1414', '#8f9a97', '#d8d6d0', '#b01010']
const SKIN = ['#f0c8a4', '#e2b08a', '#cf9668', '#b07a4e', '#8a5a36', '#6a4226', '#4d2f1c']

/** Body parts, told apart in the shader: shirt takes the instance colour, skin its own tone, dark is hair and trousers, arms go up in a wave. */
const SHIRT = 0
const SKIN_PART = 1
const DARK = 2
const ARM = 3

/**
 * One seated spectator facing +Z, feet on the tread at y = 0. Every triangle
 * carries a `part` id so one mesh can hold shirt, skin and hair.
 */
function spectatorGeometry(detailed: boolean) {
  const torso = new BoxGeometry(0.42, 0.56, 0.24).translate(0, 0.66, -0.08)
  const head = (detailed ? new SphereGeometry(0.125, 6, 4) : new IcosahedronGeometry(0.13, 0)).translate(0, 1.09, -0.07)
  const parts: [BufferGeometry, number | ((y: number, z: number) => number)][] = [
    [torso, SHIRT],
    // hair covers the crown and the back of the head
    [head, (y, z) => (y > 1.13 || z < -0.12 ? DARK : SKIN_PART)],
    [new BoxGeometry(0.1, 0.46, 0.12).translate(-0.27, 0.68, -0.06), ARM],
    [new BoxGeometry(0.1, 0.46, 0.12).translate(0.27, 0.68, -0.06), ARM],
  ]
  if (detailed) parts.push([new BoxGeometry(0.38, 0.15, 0.42).translate(0, 0.43, 0.13), DARK])

  const flat = parts.map(([g, part]) => [g.index ? g.toNonIndexed() : g, part] as const)
  const count = flat.reduce((n, [g]) => n + g.attributes.position.count, 0)
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const part = new Float32Array(count)
  let at = 0
  for (const [g, id] of flat) {
    const p = g.attributes.position
    position.set(p.array, at * 3)
    normal.set(g.attributes.normal.array, at * 3)
    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3
      const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3
      part.fill(typeof id === 'number' ? id : id(y, z), at + i, at + i + 3)
    }
    at += p.count
    g.dispose()
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(position, 3))
  out.setAttribute('normal', new BufferAttribute(normal, 3))
  out.setAttribute('part', new BufferAttribute(part, 1))
  return out
}

function Crowd() {
  const ref = useRef<InstancedMesh>(null)
  const seatsRef = useRef<InstancedMesh>(null)
  const quality = useStore((s) => s.quality)
  const waveNonce = useStore((s) => s.waveNonce)
  const reducedMotion = useStore((s) => s.reducedMotion)
  const wave = useRef({ start: -1 })

  const { seats, people } = useMemo(() => {
    const seats: { x: number; y: number; z: number; side: number }[] = []
    const people: number[] = []
    const rnd = lcg(42)
    const step = quality === 'high' ? 0.62 : 0.95
    for (const spec of SPECS) {
      for (let r = 0; r < spec.rows; r++) {
        const { y, z } = rowTransform(spec, r)
        for (let x = -spec.length / 2 + 1; x < spec.length / 2 - 1; x += step) {
          if (!seatFree(spec, r, x)) continue
          if (rnd() >= 0.28) people.push(seats.length)
          seats.push({ x, y, z, side: spec.side })
        }
      }
    }
    return { seats, people }
  }, [quality])

  const geometry = useMemo(() => {
    const g = spectatorGeometry(quality === 'high')
    const rnd = lcg(7)
    const skin = new Float32Array(people.length * 3)
    const seed = new Float32Array(people.length)
    const c = new Color()
    for (let i = 0; i < people.length; i++) {
      c.set(SKIN[Math.floor(rnd() * SKIN.length)]).toArray(skin, i * 3)
      seed[i] = rnd()
    }
    g.setAttribute('instanceSkin', new InstancedBufferAttribute(skin, 3))
    g.setAttribute('instanceSeed', new InstancedBufferAttribute(seed, 1))
    return g
  }, [people, quality])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uWave: { value: 1e5 }, uTime: { value: 0 }, uLife: { value: 1 } }), [])
  const material = useMemo(() => {
    const mat = new MeshLambertMaterial()
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          attribute float part;
          attribute vec3 instanceSkin;
          attribute float instanceSeed;
          uniform float uWave;
          uniform float uTime;
          uniform float uLife;`,
        )
        .replace(
          '#include <color_vertex>',
          /* glsl */ `#include <color_vertex>
          if (part > 0.5 && part < 1.5) vColor.rgb = instanceSkin;
          else if (part > 1.5 && part < 2.5) vColor.rgb = vColor.rgb * 0.08 + 0.012;`,
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `#include <begin_vertex>
          // the wave: a crest that travels along the stand; people stand as it reaches them and throw their arms up
          float away = instanceMatrix[3].x - uWave;
          float crest = exp(-away * away / 18.0);
          // between waves: everyone shifts a little in their seat, and now and then someone gets to their feet
          float restless = uLife * smoothstep(0.9965, 1.0, sin(uTime * 0.45 + instanceSeed * 6.2832));
          transformed.x += uLife * sin(uTime * (0.5 + instanceSeed) + instanceSeed * 40.0) * 0.03 * transformed.y;
          transformed.y += max(crest, restless) * 0.42 + (part > 2.5 ? crest * 0.62 : 0.0);`,
        )
    }
    mat.customProgramCacheKey = () => 'crowd'
    return mat
  }, [uniforms])
  useEffect(() => () => material.dispose(), [material])

  useLayoutEffect(() => {
    const mesh = ref.current
    const backs = seatsRef.current
    if (!mesh || !backs) return
    const o = new Object3D()
    const c = new Color()
    const rnd = lcg(7)
    people.forEach((seat, i) => {
      const s = seats[seat]
      const build = 0.9 + rnd() * 0.2
      o.position.set(s.x + (rnd() - 0.5) * 0.12, s.y, s.z + s.side * 0.12)
      // facing the pitch, heads turned a little this way and that
      o.rotation.set(0, (s.side === 1 ? Math.PI : 0) + (rnd() - 0.5) * 0.7, 0)
      o.scale.set(build, 0.88 + rnd() * 0.22, build)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      const pick = rnd()
      // a home crowd: roughly one in six in IU crimson, a few in cream
      const idx = pick > 0.86 ? SHIRTS.length - 1 : pick > 0.8 ? SHIRTS.length - 2 : Math.floor((pick / 0.8) * (SHIRTS.length - 2))
      mesh.setColorAt(i, c.set(SHIRTS[idx]))
    })
    o.rotation.set(0, 0, 0)
    seats.forEach((s, i) => {
      o.position.set(s.x, s.y + 0.5, s.z + s.side * 0.36)
      o.scale.set(1, 1, 1)
      o.updateMatrix()
      backs.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    backs.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seats, people])

  useEffect(() => {
    if (waveNonce > 0 && !useStore.getState().reducedMotion) wave.current.start = performance.now() / 1000
  }, [waveNonce])

  useFrame(({ clock }) => {
    uniforms.uLife.value = reducedMotion ? 0 : 1
    uniforms.uTime.value = clock.elapsedTime
    const w = wave.current
    if (w.start < 0) return
    const front = -80 + (performance.now() / 1000 - w.start) * 42
    uniforms.uWave.value = front > 90 ? 1e5 : front
    if (front > 90) w.start = -1
  })

  return (
    <>
      <instancedMesh ref={seatsRef} args={[undefined, undefined, seats.length]} key={`s${seats.length}`} frustumCulled={false}>
        <boxGeometry args={[0.46, 0.46, 0.07]} />
        <meshLambertMaterial color="#3f0f10" />
      </instancedMesh>
      <instancedMesh
        ref={ref}
        args={[geometry, material, people.length]}
        key={`p${people.length}`}
        frustumCulled={false}
      />
    </>
  )
}

// ---------- structure ----------

const CONCRETE = { wall: '#39413e', pier: '#48514d', plinth: '#262c2a', coping: '#525b57', stair: '#636c68', back: '#2f3633' }

function concrete(): Box[] {
  const out: Box[] = []
  for (const spec of SPECS) {
    const { side, frontZ, facade, length, rows } = spec
    const front = side * frontZ
    const toPitch = -side
    // facade wall facing the pitch, a darker plinth at its foot and a coping under the crimson trim
    out.push({ p: [0, facade / 2, front], s: [length, facade, 0.6], c: CONCRETE.wall })
    out.push({ p: [0, 0.55, front + toPitch * 0.34], s: [length, 1.1, 0.12], c: CONCRETE.plinth })
    out.push({ p: [0, facade - 0.3, front + toPitch * 0.36], s: [length, 0.6, 0.16], c: CONCRETE.coping })
    // piers: the wall is a row of bays, not one slab
    for (let x = 0; x < length / 2 - 0.5; x += BAY) {
      for (const sx of x === 0 ? [1] : [-1, 1]) {
        if (side === -1 && x === 0) continue // the players' tunnel is here
        out.push({ p: [sx * x, facade / 2, front + toPitch * 0.42], s: [0.56, facade, 0.3], c: CONCRETE.pier })
      }
    }
    // terracing
    for (let r = 0; r < rows; r++) {
      const { y, z } = rowTransform(spec, r)
      out.push({ p: [0, y - 0.2, z], s: [length, 0.4, ROW_DEPTH + 0.02], c: r % 2 ? '#4a524f' : '#424a47' })
    }
    // stairways
    const run = Math.hypot(rows * ROW_DEPTH, rows * ROW_RISE)
    for (const x of aisles(spec)) {
      out.push({
        p: [x, facade + ((rows - 1) * ROW_RISE) / 2 + 0.06, side * (frontZ + 0.6 + ((rows - 1) * ROW_DEPTH) / 2)],
        s: [AISLE_WIDTH, 0.5, run],
        rx: -side * RAKE,
        c: CONCRETE.stair,
      })
    }
    // tunnel mouths: a concrete housing set into the terrace with a dark opening
    for (const x of vomitories(spec)) {
      const first = rowTransform(spec, VOMITORY.firstRow)
      const depth = VOMITORY.rows * ROW_DEPTH
      const height = (VOMITORY.rows - 1) * ROW_RISE + 1.15
      const z0 = first.z - side * (ROW_DEPTH / 2)
      out.push({ p: [x, first.y - 0.2 + height / 2, z0 + (side * depth) / 2], s: [VOMITORY.halfWidth * 2, height, depth], c: CONCRETE.pier })
      out.push({ p: [x, first.y + 1.02, z0 + toPitch * 0.02], s: [2.5, 2.05, 0.08], c: '#050706' })
    }
    // back wall
    out.push({ p: [0, topOf(spec) / 2 + 1, backOf(spec)], s: [length, topOf(spec) + 2, 0.6], c: CONCRETE.back })
  }
  // players' tunnel under the north stand, on halfway
  const z = -NORTH.frontZ
  out.push({ p: [0, 1.75, z + 0.5], s: [5.8, 3.5, 0.5], c: '#5c1212' })
  out.push({ p: [0, 1.6, z + 0.74], s: [4.8, 3.2, 0.06], c: '#050706' })
  return out
}

const ROOF = { y: 26, frontZ: -40, depth: 18, tilt: -0.06 }

function steel(): Box[] {
  const out: Box[] = []
  const backZ = ROOF.frontZ - ROOF.depth + 0.5
  for (let x = -BAY * 8; x <= BAY * 8 + 0.1; x += BAY * 2) {
    // column at the back, a rafter cantilevered out over the seats, and a stay between them
    out.push({ p: [x, (ROOF.y - 0.6) / 2, backZ], s: [0.62, ROOF.y - 0.6, 0.62], c: '#7d8785' })
    out.push({ p: [x, ROOF.y - 0.95, ROOF.frontZ - ROOF.depth / 2], s: [0.36, 0.95, ROOF.depth - 0.3], rx: ROOF.tilt, c: '#6f7977' })
    out.push({ p: [x, 21, backZ + 4.85], s: [0.26, 0.26, 12.3], rx: -Math.atan2(8, 9.3), c: '#7d8785' })
  }
  // purlins across the rafters
  for (const dz of [-3, -8, -13]) {
    const y = ROOF.y - 0.36 - (dz + ROOF.depth / 2) * Math.sin(ROOF.tilt)
    out.push({ p: [0, y, ROOF.frontZ + dz], s: [BAY * 16 + 4, 0.2, 0.2], c: '#59625f' })
  }
  // fascia along the leading edge
  out.push({ p: [0, ROOF.y + 0.42, ROOF.frontZ + 0.05], s: [132.6, 1.25, 0.24], c: '#202624' })
  return out
}

/** End walls that follow the rake of the seats. */
function gableGeometry() {
  const pos: number[] = []
  for (const spec of SPECS) {
    const zf = spec.side * spec.frontZ
    const zb = backOf(spec)
    for (const sx of [-1, 1]) {
      const x = (sx * spec.length) / 2
      pos.push(x, 0, zf, x, spec.facade + 1.1, zf, x, topOf(spec) + 1.1, zb)
      pos.push(x, 0, zf, x, topOf(spec) + 1.1, zb, x, 0, zb)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.computeVertexNormals()
  return g
}

function Structure() {
  const walls = useMemo(concrete, [])
  const frame = useMemo(steel, [])
  const gables = useMemo(gableGeometry, [])
  // warm light inside every tunnel mouth
  const lamps = useMemo<Box[]>(() => {
    const first = rowTransform(NORTH, VOMITORY.firstRow)
    const z0 = first.z + ROW_DEPTH / 2
    return [
      ...vomitories(NORTH).map((x): Box => ({ p: [x, first.y + 1.9, z0 + 0.08], s: [2.1, 0.09, 0.05], c: '#ffd9a6' })),
      { p: [0, 3.02, -NORTH.frontZ + 0.79], s: [4.2, 0.1, 0.05], c: '#ffd9a6' },
    ]
  }, [])
  return (
    <group>
      <Boxes items={walls}>
        <meshLambertMaterial />
      </Boxes>
      <Boxes items={frame}>
        <meshStandardMaterial metalness={0.7} roughness={0.42} />
      </Boxes>
      <Boxes items={lamps}>
        <meshBasicMaterial toneMapped={false} />
      </Boxes>
      <mesh geometry={gables}>
        <meshLambertMaterial color="#343b38" side={DoubleSide} />
      </mesh>
      {/* IU crimson trim along the top of each facade */}
      {SPECS.map((spec) => (
        <mesh key={spec.side} position={[0, spec.facade, spec.side * (spec.frontZ - 0.46)]}>
          <boxGeometry args={[spec.length, 0.14, 0.06]} />
          <meshStandardMaterial color="#990000" emissive="#990000" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      {/* roof deck and the light strip under its leading edge */}
      <mesh position={[0, ROOF.y, ROOF.frontZ - ROOF.depth / 2]} rotation-x={ROOF.tilt}>
        <boxGeometry args={[132, 0.5, ROOF.depth]} />
        <meshStandardMaterial color="#9aa4a2" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, ROOF.y - 0.35, ROOF.frontZ - 0.3]}>
        <boxGeometry args={[130, 0.12, 0.3]} />
        <meshStandardMaterial color="#e9ffd0" emissive="#e9ffd0" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Skyline() {
  const blocks = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number }[] = []
    const rnd = lcg(99)
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
  return (
    <group>
      <Structure />
      <Crowd />
      <Skyline />
    </group>
  )
}
