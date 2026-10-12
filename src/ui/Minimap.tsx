import { useEffect, useRef } from 'react'
import { SECTIONS } from '../lib/sections'
import { cameraState } from '../lib/cameraState'
import { useStore } from '../state/store'

// map world (x: -75..75, z: -55..55) to a 150x110 svg
const X = (x: number) => x + 75
const Y = (z: number) => z + 55

/** Top-down stadium map: shows where you are and lets you jump anywhere. */
export function Minimap() {
  const section = useStore((s) => s.section)
  const hovered = useStore((s) => s.hovered)
  const openSection = useStore((s) => s.openSection)
  const closeSection = useStore((s) => s.closeSection)
  const cam = useRef<SVGGElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (cam.current) {
        const x = Math.max(-74, Math.min(74, cameraState.x))
        const z = Math.max(-54, Math.min(54, cameraState.z))
        const deg = (-cameraState.yaw * 180) / Math.PI + 180
        cam.current.setAttribute('transform', `translate(${X(x)} ${Y(z)}) rotate(${deg})`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <nav aria-label="Stadium map" className="glass rounded-2xl p-2">
      <svg viewBox="0 0 150 110" className="block h-[110px] w-[150px]">
        {/* stands */}
        <rect x={X(-64)} y={Y(-55)} width={128} height={13} rx="2" fill="#1a201e" />
        <rect x={X(-55)} y={Y(47)} width={110} height={8} rx="2" fill="#1a201e" />
        {/* pitch */}
        <rect x={X(-60)} y={Y(-35)} width={120} height={70} rx="2" fill="#174d2d" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
        <line x1={X(-50)} x2={X(-50)} y1={Y(-35)} y2={Y(35)} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
        <line x1={X(50)} x2={X(50)} y1={Y(-35)} y2={Y(35)} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
        <line x1={X(0)} x2={X(0)} y1={Y(-35)} y2={Y(35)} stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
        {/* camera wedge */}
        <g ref={cam} aria-hidden>
          <path d="M0 0 L-7 -14 L7 -14 Z" fill="rgba(198,255,61,0.18)" />
          <circle r="2" fill="#f4f7f5" />
        </g>
        {SECTIONS.map((s) => {
          const active = section === s.id
          const hot = hovered === s.id
          const [x, , z] = s.hotspot
          return (
            <g
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={`Go to ${s.title} (${s.zone})`}
              aria-current={active ? 'location' : undefined}
              onClick={() => (active ? closeSection() : openSection(s.id))}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openSection(s.id))}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-white"
            >
              <circle cx={X(x)} cy={Y(z)} r={active || hot ? 6 : 4.5} fill={active ? '#c6ff3d' : '#0b2a1c'} stroke="#c6ff3d" strokeWidth="1.2" />
              <text x={X(x)} y={Y(z) + 2.4} textAnchor="middle" fontSize="6.5" fontWeight="700" fill={active ? '#08100b' : '#c6ff3d'} fontFamily="JetBrains Mono">
                {s.key}
              </text>
            </g>
          )
        })}
      </svg>
    </nav>
  )
}
