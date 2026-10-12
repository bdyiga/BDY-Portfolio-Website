import { motion } from 'motion/react'

/**
 * A coach's whiteboard play, procedurally generated per project so every
 * "play" in the playbook looks different. Purely decorative.
 */
export function PlayDiagram({ seed, label }: { seed: number; label: string }) {
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)

  const attackers = Array.from({ length: 5 }, (_, i) => ({ x: 40 + i * 52 + rnd() * 14, y: 150 - i * 12 - rnd() * 10 }))
  const defenders = Array.from({ length: 4 }, (_, i) => ({ x: 60 + i * 62 + rnd() * 18, y: 62 + rnd() * 18 }))
  const carrier = Math.floor(rnd() * 3) + 1
  const runs = attackers.map((a, i) => ({
    from: a,
    to: { x: a.x + (rnd() - 0.4) * 60, y: a.y - 70 - rnd() * 40 - (i === carrier ? 30 : 0) },
  }))

  return (
    <svg viewBox="0 0 320 180" className="w-full h-auto" role="img" aria-label={`Play diagram for ${label}`}>
      <defs>
        <marker id={`arrow-${seed}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#c6ff3d" />
        </marker>
      </defs>
      <rect x="1" y="1" width="318" height="178" rx="10" fill="rgba(11,42,28,0.55)" stroke="rgba(201,209,207,0.15)" />
      {[45, 90, 135].map((y) => (
        <line key={y} x1="10" x2="310" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 6" />
      ))}
      <line x1="10" x2="310" y1="22" y2="22" stroke="rgba(255,255,255,0.25)" />
      <text x="14" y="16" fill="rgba(201,209,207,0.6)" fontSize="9" fontFamily="JetBrains Mono">TRY LINE</text>
      {/* pass line along the attack */}
      <motion.path
        d={`M${attackers[0].x} ${attackers[0].y} ${attackers
          .slice(1, carrier + 1)
          .map((a) => `L${a.x} ${a.y}`)
          .join(' ')}`}
        stroke="#c9d1cf"
        strokeWidth="1.5"
        strokeDasharray="3 4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      {runs.map((r, i) => (
        <motion.path
          key={i}
          d={`M${r.from.x} ${r.from.y} Q${(r.from.x + r.to.x) / 2 + (rnd() - 0.5) * 40} ${(r.from.y + r.to.y) / 2} ${r.to.x} ${r.to.y}`}
          stroke={i === carrier ? '#c6ff3d' : 'rgba(198,255,61,0.45)'}
          strokeWidth={i === carrier ? 2.5 : 1.5}
          fill="none"
          markerEnd={`url(#arrow-${seed})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.5 + i * 0.08 }}
        />
      ))}
      {defenders.map((d, i) => (
        <g key={i} stroke="#e46a6a" strokeWidth="2.2">
          <line x1={d.x - 6} y1={d.y - 6} x2={d.x + 6} y2={d.y + 6} />
          <line x1={d.x + 6} y1={d.y - 6} x2={d.x - 6} y2={d.y + 6} />
        </g>
      ))}
      {attackers.map((a, i) => (
        <circle key={i} cx={a.x} cy={a.y} r="8" fill={i === carrier ? '#c6ff3d' : 'transparent'} stroke="#c6ff3d" strokeWidth="2" />
      ))}
    </svg>
  )
}
