import { useId } from 'react'
import { motion } from 'motion/react'

const W = 320
const H = 170
const TRY_LINE = 22

/**
 * A coach's whiteboard play drawn from a project's real steps: one player per
 * step, the ball passed down the line in order, and the last player through the
 * gap to score. The steps are listed underneath with the same numbers.
 */
export function PlayDiagram({ steps, label }: { steps: string[]; label: string }) {
  const id = useId()
  const n = steps.length
  const players = steps.map((_, i) => ({
    x: n === 1 ? W / 2 : 46 + (i * 190) / (n - 1),
    y: n === 1 ? 120 : 142 - (i * 56) / (n - 1),
  }))
  const scorer = players[n - 1]
  const score = { x: Math.min(W - 24, scorer.x + 44), y: TRY_LINE - 8 }
  // the defensive line, with the gap where the last player goes through
  const defenders = [58, 122, 186].map((x, i) => ({ x, y: 58 + (i % 2) * 7 })).filter((d) => Math.abs(d.x - (scorer.x + 24)) > 26)

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`How ${label} works: ${steps.join(', then ')}`}>
        <defs>
          <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#eeedeb" />
          </marker>
        </defs>
        <rect x="1" y="1" width={W - 2} height={H - 2} fill="rgba(11,42,28,0.4)" stroke="rgba(201,209,207,0.15)" />
        {[62, 102, 142].map((y) => (
          <line key={y} x1="10" x2={W - 10} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 6" />
        ))}
        <line x1="10" x2={W - 10} y1={TRY_LINE} y2={TRY_LINE} stroke="rgba(255,255,255,0.25)" />
        <text x="14" y="15" fill="rgba(201,209,207,0.6)" fontSize="9" fontFamily="JetBrains Mono">
          TRY LINE
        </text>
        {defenders.map((d) => (
          <g key={d.x} stroke="#c43c3c" strokeWidth="2.2">
            <line x1={d.x - 6} y1={d.y - 6} x2={d.x + 6} y2={d.y + 6} />
            <line x1={d.x + 6} y1={d.y - 6} x2={d.x - 6} y2={d.y + 6} />
          </g>
        ))}
        {/* the passes, in order */}
        {n > 1 && (
          <motion.path
            d={`M${players.map((p) => `${p.x} ${p.y}`).join(' L')}`}
            stroke="#c9d1cf"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.25 * n, delay: 0.2, ease: 'easeInOut' }}
          />
        )}
        {/* the run to the line */}
        <motion.path
          d={`M${scorer.x} ${scorer.y - 9} Q${scorer.x + 6} ${(scorer.y + score.y) / 2 + 8} ${score.x} ${score.y}`}
          stroke="#eeedeb"
          strokeWidth="2.5"
          fill="none"
          markerEnd={`url(#${id})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.3 + 0.25 * n, ease: 'easeOut' }}
        />
        {players.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="9" fill={i === n - 1 ? '#eeedeb' : '#0f1513'} stroke="#eeedeb" strokeWidth="2" />
            <text
              x={p.x}
              y={p.y + 3.4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fontFamily="JetBrains Mono"
              fill={i === n - 1 ? '#0f1513' : '#eeedeb'}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <ol className="mt-2 grid gap-1 text-sm text-silver">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-xs leading-5 text-cream">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  )
}
