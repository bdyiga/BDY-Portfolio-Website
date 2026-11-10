import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import gsap from 'gsap'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  SpotLight,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three'
import { player } from '../lib/player'
import { lighting } from '../lib/sceneState'
import { useStore } from '../state/store'
import { drawTowerPanel } from '../lib/textures'
import { useCanvasTexture } from './useCanvasTexture'

const DAY = { top: new Color('#2f7fd0'), bottom: new Color('#cfe8f6'), fog: new Color('#c4dfee') }
const NIGHT = { top: new Color('#010403'), bottom: new Color('#0a1a12'), fog: new Color('#050c08') }

const TOWERS: [number, number][] = [
  [-74, -50],
  [74, -50],
  [-74, 52],
  [74, 52],
]
const TOWER_H = 40

/** Per-tower power (0..1), driven by the intro "lights on" sequence. */
export const towerPower = [0, 0, 0, 0]

function SkyDome() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: NIGHT.top.clone() }, bottom: { value: NIGHT.bottom.clone() } },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
          void main() {
            float h = clamp(vPos.y * 1.6 + 0.05, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0);
          }`,
      }),
    [],
  )
  useFrame(() => {
    mat.uniforms.top.value.copy(NIGHT.top).lerp(DAY.top, lighting.day)
    mat.uniforms.bottom.value.copy(NIGHT.bottom).lerp(DAY.bottom, lighting.day)
  })
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  )
}

function glareTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.45)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

/** The tower shadow maps follow #13, so four small maps give crisp shadows anywhere on the pitch. */
const shadowFollow = new Object3D()
const SHADOW_RADIUS = 7
const _lightPos = new Vector3()
const _toCam = new Vector3()
const _fwd = new Vector3()

function Tower({ index, x, z, quality }: { index: number; x: number; z: number; quality: 'high' | 'low' }) {
  const panelTex = useCanvasTexture(256, 128, drawTowerPanel)
  const spot = useRef<SpotLight>(null)
  const head = useRef<Group>(null)
  const glare = useRef<Sprite>(null)
  const glareMat = useMemo(
    () =>
      new SpriteMaterial({
        map: glareTexture(),
        color: '#f1f5ff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  )
  const panelMat = useMemo(
    () => new MeshStandardMaterial({ color: '#222', emissive: '#ffffff', emissiveIntensity: 0, toneMapped: false }),
    [],
  )
  useEffect(() => {
    panelMat.emissiveMap = panelTex
    panelMat.needsUpdate = true
  }, [panelMat, panelTex])

  // each tower lights its own quarter: four pools that overlap at halfway, with a long soft edge that spills onto the stands
  const aimWorld = useMemo(() => [x * 0.42, 0, z * 0.16] as const, [x, z])
  const aim = useMemo(() => new Object3D(), [])

  useEffect(() => {
    head.current?.parent?.updateWorldMatrix(true, false)
    if (head.current) head.current.lookAt(aimWorld[0], aimWorld[1], aimWorld[2])
    if (spot.current) spot.current.target = aim
  }, [aim, aimWorld])

  // shadows: aim the shadow camera at #13 (not at the pool) and narrow it to a few metres around him
  useEffect(() => {
    const light = spot.current
    if (!light) return
    const shadow = light.shadow
    shadow.mapSize.set(1024, 1024)
    shadow.camera.near = 20
    shadow.camera.far = 220
    shadow.bias = -0.0004
    shadow.normalBias = 0.02
    const base = shadow.updateMatrices
    shadow.updateMatrices = function (l: SpotLight) {
      const target = l.target
      _lightPos.setFromMatrixPosition(l.matrixWorld)
      this.focus = Math.min(1, Math.atan(SHADOW_RADIUS / _lightPos.distanceTo(shadowFollow.position)) / l.angle)
      l.target = shadowFollow
      base.call(this, l)
      l.target = target
    }
    return () => {
      shadow.updateMatrices = base
    }
  }, [])

  useFrame(({ camera }) => {
    const night = 1 - lighting.day
    const p = towerPower[index] * lighting.level
    if (spot.current) spot.current.intensity = p * (0.3 + night * 3.1)
    panelMat.emissiveIntensity = p * (0.6 + night * 2.4)
    if (glare.current && head.current) {
      // only from in front of the lamps, never through the back of the head
      glare.current.getWorldPosition(_lightPos)
      _toCam.copy(camera.position).sub(_lightPos).normalize()
      head.current.getWorldDirection(_fwd)
      const facing = MathUtils.smoothstep(_toCam.dot(_fwd), 0.1, 0.7)
      glareMat.opacity = p * night * facing * (quality === 'high' ? 0.55 : 0.8)
    }
  })

  return (
    <group position={[x, 0, z]}>
      <mesh position-y={TOWER_H / 2}>
        <cylinderGeometry args={[0.45, 1.1, TOWER_H, 8]} />
        <meshStandardMaterial color="#8d9795" metalness={0.8} roughness={0.35} />
      </mesh>
      <group ref={head} position-y={TOWER_H}>
        <mesh>
          <boxGeometry args={[9, 4.5, 0.6]} />
          <meshStandardMaterial color="#2a302e" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position-z={0.31} material={panelMat}>
          <planeGeometry args={[8.6, 4.1]} />
        </mesh>
        <sprite ref={glare} position-z={0.6} scale={[26, 26, 1]} material={glareMat} />
      </group>
      <spotLight
        ref={spot}
        position-y={TOWER_H}
        angle={0.72}
        penumbra={0.9}
        decay={0}
        distance={0}
        color="#f1f5ff"
        castShadow={quality === 'high'}
      />
      <primitive object={aim} position={[aimWorld[0] - x, 0, aimWorld[2] - z]} />
    </group>
  )
}

export function Atmosphere() {
  const night = useStore((s) => s.night)
  const quality = useStore((s) => s.quality)
  const reducedMotion = useStore((s) => s.reducedMotion)
  const scene = useThree((s) => s.scene)
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const stars = useRef<Group>(null)
  const sparkles = useRef<Group>(null)

  const fog = useMemo(() => new Fog(NIGHT.fog.clone(), 120, 420), [])
  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])

  useEffect(() => {
    const tween = gsap.to(lighting, {
      day: night ? 0 : 1,
      duration: reducedMotion ? 0 : 1.8,
      ease: 'power2.inOut',
    })
    return () => {
      tween.kill()
    }
  }, [night, reducedMotion])

  useFrame(() => {
    const d = lighting.day
    const lv = lighting.level
    shadowFollow.position.set(player.pos.x, 1, player.pos.z)
    shadowFollow.updateMatrixWorld()
    fog.color.copy(NIGHT.fog).lerp(DAY.fog, d)
    fog.near = 110 - d * 30
    fog.far = 380 + d * 20
    if (hemi.current) {
      hemi.current.intensity = (0.12 + d * 1.05) * (0.25 + lv * 0.75)
      hemi.current.color.set(d > 0.5 ? '#e8f4ff' : '#9fc4b4')
    }
    if (sun.current) sun.current.intensity = d * 2.4 * (0.3 + lv * 0.7)
    if (stars.current) stars.current.visible = d < 0.6
    if (sparkles.current) sparkles.current.visible = d < 0.5 && lv > 0.5
  })

  return (
    <>
      <SkyDome />
      <hemisphereLight ref={hemi} args={['#9fc4b4', '#0b2a1c', 0.2]} />
      <directionalLight ref={sun} position={[60, 90, 40]} intensity={0} color="#fff6e6" />
      <group ref={stars}>
        <Stars radius={260} depth={60} count={quality === 'high' ? 2500 : 1000} factor={6} saturation={0} fade speed={reducedMotion ? 0 : 0.6} />
      </group>
      {quality === 'high' && !reducedMotion && (
        <group ref={sparkles}>
          <Sparkles count={140} scale={[118, 16, 72]} position={[0, 8, 0]} size={3} speed={0.25} opacity={0.55} color="#f1f5ff" />
        </group>
      )}
      {TOWERS.map(([x, z], i) => (
        <Tower key={i} index={i} x={x} z={z} quality={quality} />
      ))}
    </>
  )
}
