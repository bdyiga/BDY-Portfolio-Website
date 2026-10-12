import { useEffect } from 'react'
import { motion } from 'motion/react'
import { leadership } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { Panel, Reveal } from '../Panel'

/** Positions on a half-pitch formation for the team sheet. */
const SPOTS: Record<number, [number, number]> = {
  7: [70, 34],
  9: [120, 62],
  10: [170, 84],
  12: [215, 104],
  14: [262, 126],
  15: [160, 148],
}

export function LeadershipPanel() {
  const index = useStore((s) => s.item.leadership)
  const selectItem = useStore((s) => s.selectItem)
  const sel = index ?? 0
  useEffect(() => {
    if (index === null && window.innerWidth >= 900) selectItem('leadership', 0)
  }, [index, selectItem])
  const l = leadership[sel]

  return (
    <Panel id="leadership">
      <p className="text-sm text-silver">
        No one scores alone. If my leadership were a team sheet, it would look like this. Every role is real; the jersey numbers are just how I picture the
        team.
      </p>

      <Reveal className="mt-4">
        <svg viewBox="0 0 320 172" className="w-full" role="group" aria-label="Team sheet formation">
          <rect x="1" y="1" width="318" height="170" rx="12" fill="rgba(11,42,28,0.6)" stroke="rgba(201,209,207,0.15)" />
          <line x1="10" x2="310" y1="18" y2="18" stroke="rgba(255,255,255,0.25)" />
          <line x1="10" x2="310" y1="100" y2="100" stroke="rgba(255,255,255,0.08)" strokeDasharray="5 6" />
          {/* support lines between teammates */}
          {leadership.slice(1).map((m, i) => {
            const a = SPOTS[leadership[i].number]
            const b = SPOTS[m.number]
            return <line key={m.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(198,255,61,0.25)" strokeDasharray="3 4" />
          })}
          {leadership.map((m, i) => {
            const [x, y] = SPOTS[m.number]
            const active = i === sel
            return (
              <g
                key={m.id}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`#${m.number}: ${m.role}, ${m.org}`}
                onClick={() => selectItem('leadership', i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectItem('leadership', i))}
                className="cursor-pointer outline-none [&:focus-visible>path]:stroke-white"
              >
                <motion.path
                  d={`M${x - 13} ${y - 10} l6 -5 h14 l6 5 l-4 6 h-2 v16 h-20 v-16 h-2 z`}
                  fill={active ? '#c6ff3d' : '#0b2a1c'}
                  stroke="#c6ff3d"
                  strokeWidth="1.5"
                  animate={{ scale: active ? 1.15 : 1 }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />
                <text x={x} y={y + 6} textAnchor="middle" fontSize="10" fontWeight="800" fill={active ? '#08100b' : '#f4f7f5'} fontFamily="Archivo">
                  {m.number}
                </text>
              </g>
            )
          })}
        </svg>
      </Reveal>

      <motion.article key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="kicker">
          #{l.number} · {l.period ?? 'Team member'}
        </p>
        <h3 className="display mt-2 text-xl leading-tight">{l.role}</h3>
        <p className="mt-1 text-sm text-silver">{l.org}</p>
        {l.description && <p className="mt-3 text-[0.93rem] leading-relaxed text-silver">{l.description}</p>}
      </motion.article>

      <ul className="mt-4 space-y-1.5" aria-label="All leadership roles">
        {leadership.map((m, i) => (
          <li key={m.id}>
            <button
              onClick={() => selectItem('leadership', i)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                i === sel ? 'border-lime/60 bg-lime/10' : 'border-white/8 hover:border-lime/35'
              }`}
            >
              <span className="w-6 font-display font-black text-lime">{m.number}</span>
              <span className="flex-1">
                <span className="block font-semibold leading-tight">{m.role}</span>
                <span className="block text-xs text-silver-dim">{m.org}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
