import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ACESFilmicToneMapping, Group, SRGBColorSpace } from 'three'
import { SECTIONS, GOALPOSTS_X } from '../lib/sections'
import { useStore } from '../state/store'
import { Atmosphere } from './Atmosphere'
import { AdBoards } from './AdBoards'
import { Director } from './Director'
import { ExperienceMarkers } from './ExperienceMarkers'
import { Goalposts } from './Goalposts'
import { Hotspot } from './Hotspot'
import { LeadershipBanners } from './LeadershipBanners'
import { Pitch } from './Pitch'
import { ProjectHolograms } from './ProjectHolograms'
import { RugbyBall } from './RugbyBall'
import { Scoreboard } from './Scoreboard'
import { Stands } from './Stands'
import { TrainingGround } from './TrainingGround'
import { Trophy } from './Trophy'

/** Subtle "world follows the mouse" parallax, without fighting the camera controls. */
function Parallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const pointer = useThree((s) => s.pointer)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const { reducedMotion, phase } = useStore.getState()
    const on = !reducedMotion && phase !== 'entering'
    const ty = on ? pointer.x * 0.012 : 0
    const tx = on ? -pointer.y * 0.006 : 0
    const k = Math.min(1, dt * 2.5)
    g.rotation.y += (ty - g.rotation.y) * k
    g.rotation.x += (tx - g.rotation.x) * k
  })
  return <group ref={ref}>{children}</group>
}

/** Fires once the scene has mounted and rendered a frame. */
function Ready({ onReady }: { onReady: () => void }) {
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    fired.current = true
    requestAnimationFrame(() => onReady())
  })
  return null
}

function Scene({ onReady }: { onReady: () => void }) {
  const quality = useStore((s) => s.quality)
  return (
    <>
      <Director />
      <Atmosphere />
      <Parallax>
        <Pitch quality={quality} />
        <Goalposts x={-GOALPOSTS_X} />
        <Goalposts x={GOALPOSTS_X} interactive />
        <Stands />
        <AdBoards />
        <Scoreboard />
        <ProjectHolograms />
        <ExperienceMarkers />
        <LeadershipBanners />
        <TrainingGround />
        <Trophy />
        <RugbyBall />
        {SECTIONS.map((s) => (
          <Hotspot key={s.id} meta={s} />
        ))}
      </Parallax>
      <Ready onReady={onReady} />
    </>
  )
}

export default function Experience({ onReady, paused = false }: { onReady: () => void; paused?: boolean }) {
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const setWebglFailed = useStore((s) => s.setWebglFailed)
  const reducedMotion = useStore((s) => s.reducedMotion)

  useEffect(() => () => void (document.body.style.cursor = ''), [])

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      frameloop={paused ? 'never' : 'always'}
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1.25]}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 45, near: 0.5, far: 1200, position: [0, 30, 120] }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.outputColorSpace = SRGBColorSpace
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          setWebglFailed()
        })
      }}
      onPointerMissed={() => useStore.getState().setHovered(null)}
      aria-hidden
    >
      <color attach="background" args={['#020403']} />
      <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Scene onReady={onReady} />
      </Suspense>
      {quality === 'high' && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.28} darkness={reducedMotion ? 0.45 : 0.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
