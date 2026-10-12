import { AnimatePresence, motion } from 'motion/react'
import { projects } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { ExternalIcon, GithubIcon } from '../icons'
import { Panel, Reveal, Tags } from '../Panel'
import { PlayDiagram } from '../PlayDiagram'

export function ProjectsPanel() {
  const index = useStore((s) => s.item.projects)
  const selectItem = useStore((s) => s.selectItem)
  const p = index !== null ? projects[index] : null

  return (
    <Panel id="projects">
      <p className="text-sm text-silver">
        Every project is a play I designed, drilled, and ran. Pick a play to fly over to its hologram.
      </p>
      <ol className="mt-4 grid grid-cols-1 gap-1.5" aria-label="Playbook">
        {projects.map((proj, i) => (
          <li key={proj.id}>
            <button
              onClick={() => selectItem('projects', index === i ? null : i)}
              aria-expanded={index === i}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                index === i ? 'border-lime/60 bg-lime/10' : 'border-white/8 bg-white/[0.02] hover:border-lime/35'
              }`}
            >
              <span className="font-mono text-xs text-lime">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold leading-tight">{proj.title}</span>
                <span className="block text-xs text-silver-dim">{proj.short}</span>
              </span>
              {proj.badge && <span className="rounded bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-charcoal">{proj.badge}</span>}
            </button>
            <AnimatePresence initial={false}>
              {p && index === i && (
                <motion.div
                  key={p.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 mb-3 rounded-2xl border border-white/10 bg-forest/35 p-4">
                    <p className="kicker">
                      Play {String(i + 1).padStart(2, '0')} · {p.play}
                      {p.period ? ` · ${p.period}` : ''}
                    </p>
                    <Reveal className="mt-3">
                      <PlayDiagram seed={i + 3} label={p.title} />
                    </Reveal>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-silver">{p.description}</p>
                    <div className="mt-3">
                      <Tags items={p.tags} delay={0.15} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.link && (
                        <a className="btn btn-lime" href={p.link.url} target="_blank" rel="noreferrer">
                          {p.link.label} <ExternalIcon size={15} />
                        </a>
                      )}
                      {p.github && (
                        <a className="btn btn-ghost" href={p.github} target="_blank" rel="noreferrer">
                          <GithubIcon size={15} /> Source on GitHub
                        </a>
                      )}
                      {!p.link && !p.github && (
                        <span className="text-xs text-silver-dim">Case competition: no public repository.</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
