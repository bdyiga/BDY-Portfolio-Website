import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { education, featuredProjectIds, profile, projects } from '../data/portfolio'
import { useStore } from '../state/store'
import { ArrowRight, DownloadIcon, LinkedinIcon, ListIcon, MailIcon } from './icons'

const EASE = [0.22, 1, 0.36, 1] as const

const featured = featuredProjectIds
  .map((id) => projects.findIndex((p) => p.id === id))
  .filter((i) => i >= 0)
  .slice(0, 3)

/**
 * Title card. Everything a recruiter needs is here and clickable from the first
 * frame: the floodlights are the motion, the information never waits for them.
 */
export function Intro() {
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const setQuickView = useStore((s) => s.setQuickView)
  const openSection = useStore((s) => s.openSection)
  const enterBtn = useRef<HTMLButtonElement>(null)
  const leaving = phase === 'entering'

  useEffect(() => {
    enterBtn.current?.focus({ preventScroll: true })
  }, [])

  const enter = () => setPhase('entering')
  const skip = () => setPhase('world')

  const [first, ...rest] = profile.name.split(' ')
  const last = rest.pop() ?? ''
  const middle = rest.join(' ')

  // on desktop these sit under the two main buttons; on phones, under the project cards
  const links = (
    <>
      <a className="btn btn-ghost flex-1 justify-center !px-3 lg:flex-none" href={profile.resumeUrl} download>
        <DownloadIcon size={15} /> Resume
      </a>
      <a className="btn btn-ghost flex-1 justify-center !px-3 lg:flex-none" href={`mailto:${profile.email}`}>
        <MailIcon size={15} /> Email
      </a>
      <a className="btn btn-ghost flex-1 justify-center !px-3 lg:flex-none" href={profile.linkedin} target="_blank" rel="noreferrer">
        <LinkedinIcon size={15} /> LinkedIn
      </a>
    </>
  )

  return (
    <motion.section
      className="fixed inset-0 z-20 overflow-y-auto"
      aria-label="Introduction"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      style={{ pointerEvents: leaving ? 'none' : undefined }}
    >
      {/* legibility: darken the lower-left where the lower-third sits, leave #13 lit */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,transparent_30%,rgba(2,4,3,0.9)_75%)] md:bg-[linear-gradient(90deg,rgba(2,4,3,0.82)_0%,rgba(2,4,3,0.4)_45%,transparent_70%),linear-gradient(0deg,rgba(2,4,3,0.85),transparent_45%)]"
        aria-hidden
      />

      <div className="flex min-h-full flex-col justify-end px-4 pb-5 pt-[min(33dvh,280px)] md:px-10 md:pb-10 md:pt-24">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          {/* lower-third */}
          <motion.div
            className="max-w-[46rem]"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex items-stretch gap-3">
              <span className="slab-band display grid w-[3.2rem] shrink-0 place-items-center text-[2rem] md:w-[4.6rem] md:text-[3rem]" aria-hidden>
                13
              </span>
              <h1 className="min-w-0" aria-label={profile.name}>
                <span className="strap block text-[0.95rem] text-cream/80 md:text-lg" aria-hidden>
                  {first} {middle}
                </span>
                <span className="display block text-[clamp(3rem,15vw,7rem)] text-ink" aria-hidden>
                  {last}
                </span>
              </h1>
            </div>

            <p className="strap mt-4 text-[0.95rem] text-cream md:text-lg">
              {education.degree} · {education.specialization.replace(' Specialization', '')}
              <span className="text-silver-dim"> · </span>
              {education.school}
            </p>
            <p className="mt-1 text-sm text-silver md:text-base">
              {profile.availability} <span className="text-silver-dim">GPA {education.gpa}.</span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:mt-5">
              <button
                ref={enterBtn}
                onClick={enter}
                disabled={leaving}
                className="btn btn-lime group justify-center !whitespace-normal !px-4 !py-3.5 text-[0.95rem] font-bold leading-tight sm:!px-6"
              >
                Enter my world
                <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                className="btn btn-cream justify-center !whitespace-normal !px-4 !py-3.5 text-left text-[0.95rem] font-bold leading-tight sm:!px-6"
                onClick={() => setQuickView(true)}
              >
                <ListIcon size={16} className="hidden shrink-0 sm:block" /> See everything on one page
              </button>
            </div>
            <div className="mt-2 hidden gap-2 lg:flex">{links}</div>
          </motion.div>

          {/* featured projects: one click to the result */}
          <motion.nav
            aria-label="Featured projects"
            className="w-full lg:w-[23rem] lg:shrink-0"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          >
            <div className="slab-band strap flex items-center justify-between px-3 py-1.5 text-sm">
              <span>Featured projects</span>
              <button className="underline-offset-2 hover:underline" onClick={() => openSection('projects')}>
                All {projects.length}
              </button>
            </div>
            <ol className="slab divide-y divide-white/10 !border-t-0">
              {featured.map((i) => {
                const p = projects[i]
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => openSection('projects', i)}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left md:py-3 transition-colors hover:bg-white/[0.05]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="strap block text-[1.05rem] leading-tight text-ink">{p.title}</span>
                        <span className="block truncate text-xs text-silver">{p.short}</span>
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-silver transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="mt-2 flex gap-2 lg:hidden">{links}</div>
          </motion.nav>
        </div>
      </div>

      {/* ident + skip: fixed top corners */}
      <p className="strap pointer-events-none fixed left-4 top-4 text-sm text-cream/80 md:left-10 md:top-6" aria-hidden>
        BDY's World <span className="hidden text-silver-dim sm:inline">· {profile.tagline.replace(/\.$/, '')}</span>
      </p>
      <button className="bar-btn fixed right-4 top-3 md:right-10 md:top-5" onClick={skip}>
        Skip intro
      </button>
    </motion.section>
  )
}

export function Loader() {
  const setQuickView = useStore((s) => s.setQuickView)
  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-[#020403]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      role="status"
      aria-live="polite"
    >
      <div className="w-[min(340px,80vw)] text-center">
        <p className="display text-3xl">
          BDY<span className="text-crimson">.</span>
        </p>
        <p className="mt-4 kicker">Warming up the floodlights</p>
        <div className="relative mt-4 h-0.5 overflow-hidden bg-white/10">
          <div className="loader-bar absolute inset-y-0 w-2/5 bg-cream" />
        </div>
        <p className="mt-4 text-xs text-silver-dim">Building the stadium in your browser. Nothing heavy to download.</p>
        <button className="btn btn-cream mt-6" onClick={() => setQuickView(true)}>
          <ListIcon size={16} /> See everything on one page
        </button>
      </div>
    </motion.div>
  )
}
