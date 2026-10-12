import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { education, experiences, projects, skillGroups, whereUsed } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { Panel } from '../Panel'

export function SkillsPanel() {
  const stored = useStore((s) => s.item.skills)
  const selectItem = useStore((s) => s.selectItem)
  const openSection = useStore((s) => s.openSection)
  const index = stored ?? 0
  const group = skillGroups[index]
  const [skill, setSkill] = useState<string | null>(null)
  useEffect(() => {
    if (stored === null) selectItem('skills', 0)
  }, [stored, selectItem])
  const used = skill ? whereUsed(skill) : []

  return (
    <Panel id="skills">
      <p className="text-sm text-silver">
        No made-up percentages. Pick a drill, then tap a skill to see where I've actually used it on the field.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Skill categories">
        {skillGroups.map((g, i) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={i === index}
            onClick={() => {
              selectItem('skills', i)
              setSkill(null)
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              i === index ? 'border-lime bg-lime text-charcoal' : 'border-white/15 text-silver hover:border-lime/50'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <motion.section key={group.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5" role="tabpanel">
        <p className="kicker">Drill: {group.drill}</p>
        <h3 className="display mt-2 text-2xl">{group.name}</h3>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {group.skills.map((s, i) => {
            const count = whereUsed(s).length
            return (
              <motion.li
                key={s}
                initial={{ opacity: 0, y: 10, rotate: -2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 22 }}
              >
                <button
                  onClick={() => setSkill(skill === s ? null : s)}
                  aria-pressed={skill === s}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    skill === s ? 'border-lime bg-lime/10 shadow-[0_0_18px_rgba(198,255,61,0.18)]' : 'border-white/10 bg-white/[0.02] hover:border-lime/40'
                  }`}
                >
                  <span className="font-medium">{s}</span>
                  {count > 0 && (
                    <span className="font-mono text-[0.65rem] text-lime" title={`Used in ${count} project(s) or role(s)`}>
                      ×{count}
                    </span>
                  )}
                </button>
              </motion.li>
            )
          })}
        </ul>
      </motion.section>

      <AnimatePresence mode="wait">
        {skill && (
          <motion.div
            key={skill}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 rounded-2xl border border-lime/25 bg-forest/40 p-4"
            aria-live="polite"
          >
            <p className="kicker">Where {skill} shows up</p>
            {used.length ? (
              <ul className="mt-3 space-y-1.5">
                {used.map((u) => (
                  <li key={u.kind + u.id}>
                    <button
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm hover:border-lime/50"
                      onClick={() =>
                        u.kind === 'project'
                          ? openSection('projects', projects.findIndex((p) => p.id === u.id))
                          : openSection('experience', experiences.findIndex((e) => e.id === u.id))
                      }
                    >
                      <span>{u.title}</span>
                      <span className="font-mono text-[0.65rem] uppercase tracking-widest text-silver-dim">{u.kind === 'project' ? 'Project' : 'Experience'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-silver">Part of my toolkit; not tagged on a specific project or role in this portfolio.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
        <span className="display text-2xl text-gold">AWS</span>
        <span className="text-sm text-silver">{education.certifications[0]}</span>
      </div>
    </Panel>
  )
}
