import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { education, experiences, featuredProjectIds, leadership, profile, projects, skillGroups } from '../data/portfolio'
import { SECTIONS, SECTION_BY_ID, type SectionId } from '../lib/sections'
import { useStore } from '../state/store'
import { ArrowLeft, ArrowRight, CloseIcon, DownloadIcon, LinkedinIcon, ListIcon, MailIcon } from './icons'

/**
 * The guided tour: one stop per zone, in order. Each stop is a short card that
 * waits for the camera to settle; "Know more" (or any row) opens the full panel.
 * Everything here is a summary of what portfolio.ts already says.
 */

/** A row in a stop's summary that opens its detail. */
function Row({ title, sub, onOpen }: { title: string; sub?: string; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="group flex w-full items-baseline justify-between gap-3 py-2 text-left hover:text-cream">
        <span className="min-w-0">
          <span className="block font-semibold text-ink group-hover:text-cream">{title}</span>
          {sub && <span className="block truncate text-xs text-silver-dim">{sub}</span>}
        </span>
        <ArrowRight size={14} className="shrink-0 text-silver-dim group-hover:text-cream" />
      </button>
    </li>
  )
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="mt-3 divide-y divide-white/8">{children}</ul>
}

function Summary({ id }: { id: SectionId }) {
  const openItem = (section: SectionId, item: number) => {
    const st = useStore.getState()
    st.selectItem(section, item)
    st.setTourDetail(true)
  }

  switch (id) {
    case 'about':
      return (
        <>
          <p className="text-lg font-semibold text-ink">{profile.name}</p>
          <p className="mt-1 text-sm text-silver">
            {education.degree}, {education.specialization} · {education.school}
          </p>
          <p className="mt-1 text-sm text-silver">
            GPA {education.gpa} · Graduating {education.graduation}
          </p>
          <p className="mt-3 text-sm text-silver">{profile.availability}</p>
        </>
      )
    case 'projects':
      return (
        <>
          <p className="text-sm text-silver">
            {projects.length} projects. Three to start with:
          </p>
          <Rows>
            {featuredProjectIds.map((pid) => {
              const i = projects.findIndex((p) => p.id === pid)
              const p = projects[i]
              return p ? <Row key={pid} title={p.title} sub={p.short} onOpen={() => openItem('projects', i)} /> : null
            })}
          </Rows>
        </>
      )
    case 'experience':
      return (
        <>
          <p className="text-sm text-silver">{experiences.length} roles, most recent first.</p>
          <Rows>
            {experiences
              .map((e, i) => ({ e, i }))
              .reverse()
              .map(({ e, i }) => (
                <Row key={e.id} title={`${e.role}`} sub={`${e.company} · ${e.start} – ${e.end}`} onOpen={() => openItem('experience', i)} />
              ))}
          </Rows>
        </>
      )
    case 'leadership':
      return (
        <Rows>
          {leadership.slice(0, 4).map((l, i) => (
            <Row key={l.id} title={l.role} sub={l.org} onOpen={() => openItem('leadership', i)} />
          ))}
        </Rows>
      )
    case 'skills':
      return (
        <>
          <Rows>
            {skillGroups.map((g, i) => (
              <Row
                key={g.id}
                title={g.name}
                sub={g.skills.slice(0, 4).join(', ') + (g.skills.length > 4 ? ` +${g.skills.length - 4}` : '')}
                onOpen={() => openItem('skills', i)}
              />
            ))}
          </Rows>
          <p className="mt-3 text-sm text-silver">{education.certifications.join(', ')}</p>
        </>
      )
    case 'contact':
      return (
        <>
          <p className="text-sm text-silver">{profile.availability}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-cream max-w-full" href={`mailto:${profile.email}`}>
              <MailIcon size={15} /> <span className="truncate">{profile.email}</span>
            </a>
            <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
              <LinkedinIcon size={15} /> LinkedIn
            </a>
            <a className="btn btn-ghost" href={profile.resumeUrl} download>
              <DownloadIcon size={15} /> Resume
            </a>
          </div>
        </>
      )
  }
}

/** Headline for each stop, in plain words. */
const HEADLINE: Record<SectionId, string> = {
  about: 'Who I am',
  projects: "What I've built",
  experience: "Where I've worked",
  leadership: "Who I've led",
  skills: 'What I work with',
  contact: "Let's talk",
}

/** One stop's card. It holds on to its own stop, so it can animate out while the next one comes in. */
export function TourCard({ id: section }: { id: SectionId }) {
  const tourStep = useStore((s) => s.tourStep)
  const setTourDetail = useStore((s) => s.setTourDetail)
  const endTour = useStore((s) => s.endTour)
  const setQuickView = useStore((s) => s.setQuickView)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [section])

  const meta = SECTION_BY_ID[section]
  const at = SECTIONS.findIndex((s) => s.id === section)
  const last = at === SECTIONS.length - 1
  const next = SECTIONS[at + 1]

  return (
    <motion.aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      className="slab fixed z-30 flex max-h-[50dvh] flex-col inset-x-0 bottom-0
        md:inset-x-auto md:bottom-4 md:right-4 md:max-h-[calc(100dvh-6rem)] md:w-[min(420px,calc(100vw-2rem))]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      // the camera settles first, then the card
      transition={{ duration: 0.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="slab-band flex items-center justify-between gap-3 py-2 pl-5 pr-2">
        <p className="strap text-sm">
          Stop {at + 1} of {SECTIONS.length} <span className="text-cream/60">·</span> {meta.title}
        </p>
        <button className="icon-btn !border-transparent !bg-transparent" onClick={endTour} aria-label="Leave the tour and explore freely" title="Explore freely">
          <CloseIcon />
        </button>
      </header>
      {/* progress: one segment per stop */}
      <div className="flex gap-1 px-5 pt-3" aria-hidden>
        {SECTIONS.map((s, i) => (
          <span key={s.id} className={`h-0.5 flex-1 ${i <= at ? 'bg-cream' : 'bg-white/12'}`} />
        ))}
      </div>
      <div className="scroll-area flex-1 overflow-y-auto px-5 pt-3 pb-4">
        <h2 id="tour-title" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink outline-none">
          {HEADLINE[section]}
        </h2>
        <div className="mt-2">
          <Summary id={section} />
        </div>
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2.5">
        <button className="btn btn-ghost !px-3" onClick={() => tourStep(-1)} disabled={at === 0} aria-label="Previous stop">
          <ArrowLeft size={16} />
        </button>
        {section !== 'contact' && (
          <button className="btn btn-ghost" onClick={() => setTourDetail(true)}>
            Know more
          </button>
        )}
        {last && (
          <button className="btn btn-ghost" onClick={() => setQuickView(true)}>
            <ListIcon size={15} /> One page
          </button>
        )}
        <button className="btn btn-cream ml-auto" onClick={() => tourStep(1)}>
          {last ? 'Finish the tour' : `Next: ${next.title.replace('Technical ', '')}`} <ArrowRight size={16} />
        </button>
      </footer>
    </motion.aside>
  )
}

/** Inside the tour, the full panel keeps the way back to the summary and on to the next stop. */
export function TourBar({ id }: { id: SectionId }) {
  const setTourDetail = useStore((s) => s.setTourDetail)
  const tourStep = useStore((s) => s.tourStep)
  const at = SECTIONS.findIndex((s) => s.id === id)
  const next = SECTIONS[at + 1]
  return (
    <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-sm">
      <button className="btn btn-ghost !px-3" onClick={() => setTourDetail(false)}>
        <ArrowLeft size={16} /> Summary
      </button>
      <button className="btn btn-cream" onClick={() => tourStep(1)}>
        {next ? `Next: ${next.title.replace('Technical ', '')}` : 'Finish the tour'} <ArrowRight size={16} />
      </button>
    </footer>
  )
}
