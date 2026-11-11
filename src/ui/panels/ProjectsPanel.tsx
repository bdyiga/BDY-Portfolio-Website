import { projects } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { CloseIcon, ExternalIcon, GithubIcon } from '../icons'
import { Panel, Reveal, Tags } from '../Panel'
import { PlayDiagram } from '../PlayDiagram'

export function ProjectsPanel() {
  const index = useStore((s) => s.item.projects)
  const selectItem = useStore((s) => s.selectItem)
  // on the tour the card is the list; this is just the project picked
  const tour = useStore((s) => s.touring)
  const p = index !== null ? projects[index] : null

  return (
    <Panel id="projects">
      {/* the picked project comes first, so its result is on screen without scrolling */}
      {p && index !== null ? (
        <Reveal key={p.id} className="mb-5">
          <article aria-labelledby="project-detail-title" className="border-l-2 border-crimson pl-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kicker">
                  Play {String(index + 1).padStart(2, '0')}
                  {p.period ? ` · ${p.period}` : ''}
                  {p.badge ? ` · ${p.badge}` : ''}
                </p>
                <h3 id="project-detail-title" className="strap mt-1 text-2xl leading-tight text-ink">
                  {p.title}
                </h3>
              </div>
              <button className="icon-btn !h-8 !w-8 shrink-0" onClick={() => selectItem('projects', null)} aria-label="Close project">
                <CloseIcon size={14} />
              </button>
            </div>
            {/* the result leads: it is what a recruiter came for */}
            {p.result && (
              <div className="mt-3 border-l-2 border-cream bg-cream/[0.07] px-3 py-2">
                <p className="kicker">Result</p>
                <p className="mt-0.5 text-[0.95rem] font-semibold leading-snug text-ink">{p.result}</p>
              </div>
            )}
            <p className="mt-2 text-[0.95rem] leading-relaxed text-silver">{p.description}</p>
            {(p.problem || p.built) && (
              <dl className="mt-3 grid gap-3">
                {p.problem && (
                  <div>
                    <dt className="kicker">The problem</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-silver">{p.problem}</dd>
                  </div>
                )}
                {p.built && (
                  <div>
                    <dt className="kicker">What I built</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-silver">{p.built}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="mt-3">
              <Tags items={p.stack ?? p.tags} />
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
              {!p.link && !p.github && <span className="text-xs text-silver-dim">Case competition: no public repository.</span>}
            </div>
            {p.screenshot && (
              <img
                src={`${import.meta.env.BASE_URL}${p.screenshot.src}`}
                alt={p.screenshot.alt}
                loading="lazy"
                decoding="async"
                className="mt-4 aspect-video w-full border border-white/10 object-cover object-top"
              />
            )}
            {p.steps && p.steps.length > 0 && (
              <div className="mt-4">
                <p className="kicker mb-1.5">The play: {p.play}</p>
                <PlayDiagram steps={p.steps} label={p.title} />
              </div>
            )}
          </article>
        </Reveal>
      ) : (
        <p className="mb-4 text-sm text-silver">Pick a project to see what it does, what it is built with, and where to try it.</p>
      )}

      {!tour && (
        <ol className="grid grid-cols-1 border-t border-white/10" aria-label="Playbook">
          {projects.map((proj, i) => (
            <li key={proj.id} className="border-b border-white/10">
              <button
                onClick={() => selectItem('projects', index === i ? null : i)}
                aria-expanded={index === i}
                className={`group flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                  index === i ? 'bg-white/[0.06]' : ''
                }`}
              >
                <span className={`font-mono text-xs ${index === i ? 'text-cream' : 'text-silver-dim'}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold leading-tight">{proj.title}</span>
                  <span className="block text-xs text-silver-dim">{proj.short}</span>
                </span>
                {proj.badge && <span className="bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-charcoal">{proj.badge}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
