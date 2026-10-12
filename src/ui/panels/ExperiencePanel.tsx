import { useEffect } from 'react'
import { motion } from 'motion/react'
import { experiences } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { Panel, Reveal, Tags } from '../Panel'

export function ExperiencePanel() {
  const stored = useStore((s) => s.item.experience)
  const selectItem = useStore((s) => s.selectItem)
  const index = stored ?? experiences.length - 1
  // open on the latest role so the 3D totem, camera and panel agree
  useEffect(() => {
    if (stored === null && window.innerWidth >= 900) selectItem('experience', experiences.length - 1)
  }, [stored, selectItem])
  const e = experiences[index]
  const pct = (index / (experiences.length - 1)) * 100

  return (
    <Panel id="experience">
      <p className="text-sm text-silver">
        The match so far, from kick-off in 2023 to the latest whistle. Each period is a role. Select one to see the play-by-play.
      </p>

      {/* match progression bar */}
      <div className="mt-6 px-2">
        <div className="flex justify-between font-mono text-[0.65rem] uppercase tracking-widest text-silver-dim">
          <span>Kick-off</span>
          <span>Now</span>
        </div>
        <div className="relative mt-3 h-1.5 rounded-full bg-white/10">
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-lime" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          <div className="absolute inset-0 flex items-center justify-between" role="tablist" aria-label="Career timeline">
            {experiences.map((x, i) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={i === index}
                aria-controls="exp-detail"
                onClick={() => selectItem('experience', i)}
                className={`relative grid h-5 w-5 -translate-x-0 place-items-center rounded-full border-2 transition-all ${
                  i <= index ? 'border-lime bg-charcoal' : 'border-white/30 bg-charcoal'
                } ${i === index ? 'scale-125 shadow-[0_0_16px_rgba(198,255,61,0.6)]' : ''}`}
                title={`${x.shortName} (${x.year})`}
              >
                <span className={`h-2 w-2 rounded-full ${i === index ? 'bg-lime' : 'bg-transparent'}`} />
                <span className="absolute top-6 whitespace-nowrap font-mono text-[0.65rem] text-silver">{x.year}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.article
        key={e.id}
        id="exp-detail"
        role="tabpanel"
        className="mt-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-baseline justify-between gap-2 font-mono text-[0.7rem] uppercase tracking-widest text-silver-dim">
            <span>Period {index + 1}</span>
            <span>
              {e.start} – {e.end}
            </span>
          </div>
          <h3 className="display mt-2 text-2xl leading-tight">{e.company}</h3>
          <p className="mt-1 text-lime">{e.role}</p>
          <p className="text-sm text-silver-dim">{e.location}</p>
        </div>

        <Reveal delay={0.1} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {e.achievements.map((a, i) => (
            <motion.div
              key={a.label}
              className="rounded-xl border border-lime/25 bg-[#040605] p-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <p className="font-display text-xl font-black text-lime [font-stretch:110%]">{a.value}</p>
              <p className="mt-1 text-[0.72rem] leading-tight text-silver">{a.label}</p>
            </motion.div>
          ))}
        </Reveal>

        <Reveal delay={0.2} className="mt-5">
          <p className="kicker mb-2">Play-by-play</p>
          <ul className="space-y-2 text-[0.93rem] leading-relaxed text-silver">
            {e.responsibilities.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.28} className="mt-5">
          <p className="kicker mb-2">Kit bag</p>
          <Tags items={e.tech} delay={0.3} />
        </Reveal>
      </motion.article>
    </Panel>
  )
}
