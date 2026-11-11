import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useInView, useScroll, useSpring, useTransform } from 'motion/react'
import { education, experiences, leadership, profile, projects, skillGroups, whereUsed } from '../data/portfolio'
import { useStore } from '../state/store'
import { CopyIcon, DownloadIcon, ExternalIcon, GithubIcon, LinkedinIcon, MailIcon, StadiumIcon, WhistleIcon } from './icons'

/**
 * The recruiter-friendly, conventional one-page portfolio (and the no-WebGL
 * fallback), laid out like a match programme: kick-off, match log, playbook,
 * training ground, team sheet, full time. Light and calm to read, with a few
 * things to touch: filter the playbook, open a role's play-by-play, tap a skill
 * to see where it was used.
 */

const SECTIONS = [
  { id: 'about', label: 'Kick-off', nav: 'About', title: 'About & education' },
  { id: 'experience', label: 'Match log', nav: 'Experience', title: 'Experience' },
  { id: 'projects', label: 'Playbook', nav: 'Projects', title: 'Projects' },
  { id: 'skills', label: 'Training ground', nav: 'Skills', title: 'Technical skills' },
  { id: 'leadership', label: 'Team sheet', nav: 'Leadership', title: 'Leadership & involvement' },
  { id: 'contact', label: 'Full time', nav: 'Contact', title: "Let's build something great together." },
] as const
type SectionKey = (typeof SECTIONS)[number]['id']

const EASE = [0.22, 1, 0.36, 1] as const

/** Rises into place the first time it scrolls into view. */
function Rise({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

function Section({ id, children }: { id: SectionKey; children: ReactNode }) {
  const n = SECTIONS.findIndex((x) => x.id === id)
  const s = SECTIONS[n]
  return (
    <section id={`qv-${id}`} data-qv={id} aria-labelledby={`qv-${id}-h`} className="scroll-mt-28 border-t border-black/10 py-16">
      <Rise>
        <p className="kicker">
          {String(n + 1).padStart(2, '0')} · {s.label}
        </p>
        <h2 id={`qv-${id}-h`} className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          {s.title}
        </h2>
      </Rise>
      <div className="mt-8">{children}</div>
    </section>
  )
}

/** A rugby ball, drawn small: the scroll marker on the pitch strip. */
function Ball({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden>
      <ellipse cx="16" cy="10" rx="15" ry="9" fill="#ffffff" stroke="#990000" strokeWidth="1.6" />
      <path d="M9 10h14" stroke="#990000" strokeWidth="1.4" />
      {[12, 15, 18, 21].map((x) => (
        <path key={x} d={`M${x - 1} 8.2v3.6`} stroke="#990000" strokeWidth="1.2" />
      ))}
    </svg>
  )
}

/** Scroll progress as a pitch: try line to try line, with the ball carried along it. */
function PitchProgress({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ container })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })
  const left = useTransform(p, (v) => `calc(${(v * 100).toFixed(2)}% - ${(v * 22).toFixed(1)}px)`)
  const fill = useTransform(p, (v) => `${(v * 100).toFixed(2)}%`)
  return (
    <div className="mx-auto h-5 max-w-5xl px-4 md:px-5" aria-hidden>
      <div className="relative h-full">
        {/* the field: try lines at the ends, the 22s and halfway between */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/10" />
        <motion.div className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#990000]/70" style={{ width: fill }} />
        {[0, 22, 50, 78, 100].map((x) => (
          <span key={x} className={`absolute top-1 bottom-1 w-px ${x === 0 || x === 100 ? 'bg-black/30' : 'bg-black/12'}`} style={{ left: `${x}%` }} />
        ))}
        <motion.div className="absolute top-1/2 -translate-y-1/2" style={{ left }}>
          <Ball className="h-3.5 w-[22px] drop-shadow-sm" />
        </motion.div>
      </div>
    </div>
  )
}

/** Counts up to a stat the first time it is seen ("12,000+", "25+", "3–4h → 30m" just shows). */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true })
  const reduced = useStore((s) => s.reducedMotion)
  // only a single number with a prefix and suffix animates; ranges and arrows show as written
  const m = /^([^\d]*)([\d,]+(?:\.\d+)?)([^\d]*)$/.exec(value)
  const [shown, setShown] = useState(m && !reduced ? m[1] + '0' + m[3] : value)
  useEffect(() => {
    if (!m || reduced) return setShown(value)
    if (!seen) return
    const target = parseFloat(m[2].replace(/,/g, ''))
    const decimals = (m[2].split('.')[1] ?? '').length
    const commas = m[2].includes(',')
    const c = animate(0, target, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => {
        const n = decimals ? v.toFixed(decimals) : String(Math.round(v))
        setShown(m[1] + (commas ? Number(n).toLocaleString('en-US') : n) + m[3])
      },
    })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, reduced, value])
  return <span ref={ref}>{shown}</span>
}

/** Scroll to a card and flash it: the cross-links from the skills. */
function useJump(root: React.RefObject<HTMLDivElement | null>) {
  return (id: string) => {
    const el = root.current?.querySelector<HTMLElement>(`#${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.animate([{ boxShadow: '0 0 0 3px rgba(153,0,0,0.45)' }, { boxShadow: '0 0 0 3px rgba(153,0,0,0)' }], {
      duration: 1600,
      delay: 500,
      easing: 'ease-out',
    })
  }
}

function MatchLog() {
  const latest = experiences.length - 1
  const [open, setOpen] = useState<Set<number>>(() => new Set([latest]))
  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  return (
    <ol className="relative space-y-5 border-l-2 border-black/10 pl-6 md:pl-8">
      {experiences
        .map((e, i) => ({ e, i }))
        .reverse()
        .map(({ e, i }, k) => {
          const isOpen = open.has(i)
          return (
            <li key={e.id} id={`qv-exp-${e.id}`} className="relative rounded-md">
              <Rise delay={k * 0.05} className="card relative rounded-md border border-black/8 bg-charcoal-2 p-5">
                {/* the year, on the touchline */}
                <span className="absolute -left-[2.2rem] top-5 grid h-7 w-7 place-items-center rounded-full border-2 border-[#990000] bg-charcoal-2 font-mono text-[0.6rem] font-bold text-[#990000] md:-left-[2.7rem]">
                  {String(e.year).slice(2)}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold">
                    {e.role} · <span className="text-cream">{e.company}</span>
                  </h3>
                  <p className="font-mono text-xs text-silver-dim">
                    {e.start} – {e.end} · {e.location}
                  </p>
                </div>
                {e.achievements.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {e.achievements.map((a) => (
                      <li key={a.label} className="rounded border border-black/8 bg-charcoal px-3 py-2">
                        <p className="text-lg font-semibold text-ink">
                          <CountUp value={a.value} />
                        </p>
                        <p className="text-xs leading-snug text-silver-dim">{a.label}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cream hover:underline"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`qv-exp-${e.id}-pbp`}
                >
                  {isOpen ? 'Hide the play-by-play' : 'Show the play-by-play'}
                  <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="inline-block">
                    ›
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`qv-exp-${e.id}-pbp`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-silver marker:text-cream/70">
                        {e.responsibilities.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {e.tech.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Rise>
            </li>
          )
        })}
    </ol>
  )
}

function Playbook() {
  // filter by the technologies that more than one project shares
  const filters = useMemo(() => {
    const count = new Map<string, number>()
    for (const p of projects) for (const t of p.tags) count.set(t, (count.get(t) ?? 0) + 1)
    return [...count.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [])
  const [filter, setFilter] = useState<string | null>(null)
  const shown = projects.map((p, i) => ({ p, i })).filter(({ p }) => !filter || p.tags.includes(filter))

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by technology">
        {[null, ...filters].map((f) => (
          <button
            key={f ?? 'all'}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === f ? 'border-[#990000] bg-[#990000] text-white' : 'border-black/15 bg-white text-silver hover:border-black/40'
            }`}
          >
            {f ?? `All ${projects.length}`}
          </button>
        ))}
      </div>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map(({ p, i }) => (
            <motion.li
              layout
              key={p.id}
              id={`qv-proj-${p.id}`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE }}
              whileHover={{ y: -3 }}
              className="card flex flex-col rounded-md border border-black/8 bg-charcoal-2 p-5"
            >
              <p className="font-mono text-xs text-cream">
                Play {String(i + 1).padStart(2, '0')} · {p.play}
                {p.period ? <span className="text-silver-dim"> · {p.period}</span> : null}
              </p>
              <h3 className="mt-1 text-lg font-bold">
                {p.title}{' '}
                {p.badge && (
                  <span className="ml-1 rounded border border-gold/50 px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold text-gold">{p.badge}</span>
                )}
              </h3>
              {p.result && <p className="mt-2 border-l-2 border-cream pl-2.5 text-sm font-semibold text-ink">{p.result}</p>}
              <p className="mt-2 flex-1 text-sm text-silver">{p.description}</p>
              {p.problem && (
                <p className="mt-2 text-sm text-silver">
                  <span className="font-semibold text-ink">The problem: </span>
                  {p.problem}
                </p>
              )}
              {p.built && (
                <p className="mt-2 text-sm text-silver">
                  <span className="font-semibold text-ink">What I built: </span>
                  {p.built}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(p.stack ?? p.tags).map((t) => (
                  <button
                    key={t}
                    className={`tag ${filter === t ? '!border-[#990000]/50 !text-[#990000]' : 'hover:!border-black/30'}`}
                    onClick={() => setFilter(filter === t ? null : t)}
                    title={`Show the projects that use ${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {(p.link || p.github) && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {p.link && (
                    <a href={p.link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cream hover:underline">
                      {p.link.label} <ExternalIcon size={14} />
                    </a>
                  )}
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cream hover:underline">
                      <GithubIcon size={14} /> GitHub
                    </a>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  )
}

function TrainingGround({ jump }: { jump: (id: string) => void }) {
  const [skill, setSkill] = useState<string | null>(null)
  const used = skill ? whereUsed(skill) : []
  return (
    <>
      <p className="text-sm text-silver">Tap a skill to see where I've used it.</p>
      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        {skillGroups.map((g, gi) => (
          <Rise key={g.id} delay={(gi % 2) * 0.05} className="card h-full rounded-md border border-black/8 bg-charcoal-2 p-5">
            <dt className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{g.name}</span>
              <span className="font-mono text-[0.68rem] uppercase tracking-wider text-silver-dim">{g.drill}</span>
            </dt>
            <dd className="mt-3 flex flex-wrap gap-1.5">
              {g.skills.map((s) => {
                const n = whereUsed(s).length
                const on = skill === s
                return (
                  <button
                    key={s}
                    onClick={() => setSkill(on ? null : s)}
                    aria-pressed={on}
                    className={`tag transition-colors ${on ? '!border-[#990000] !bg-[#990000] !text-white' : 'hover:!border-black/30'}`}
                  >
                    {s}
                    {n > 0 && <span className={`ml-1.5 ${on ? 'text-white/80' : 'text-cream'}`}>×{n}</span>}
                  </button>
                )
              })}
            </dd>
            <AnimatePresence mode="wait">
              {skill && g.skills.includes(skill) && (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 rounded-md border border-[#990000]/25 bg-charcoal p-3 text-sm"
                  aria-live="polite"
                >
                  <p className="font-semibold">Where {skill} shows up</p>
                  {used.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {used.map((u) => (
                        <li key={u.kind + u.id}>
                          <button
                            onClick={() => jump(u.kind === 'project' ? `qv-proj-${u.id}` : `qv-exp-${u.id}`)}
                            className="inline-flex items-center gap-1.5 rounded border border-black/12 bg-charcoal px-2.5 py-1 hover:border-black/40"
                          >
                            {u.title}
                            <span className="font-mono text-[0.6rem] uppercase tracking-wider text-silver-dim">
                              {u.kind === 'project' ? 'Project' : 'Role'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-silver">Part of my toolkit; not tagged on a specific project or role here.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Rise>
        ))}
      </dl>
      <p className="mt-5 text-sm text-silver">{education.certifications.join(', ')}</p>
    </>
  )
}

/** A jersey with a number on it, for the team sheet. */
function Jersey({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 40 40" className="h-11 w-11 shrink-0" aria-hidden>
      <path d="M12 5l-9 6 4 8 4-2v19h18V17l4 2 4-8-9-6c-1 3-4 5-8 5s-7-2-8-5z" fill="#990000" />
      <text x="20" y="29" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff" fontFamily="Inter, sans-serif">
        {n}
      </text>
    </svg>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-ghost"
      onClick={() =>
        navigator.clipboard?.writeText(profile.email).then(
          () => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          },
          () => undefined,
        )
      }
    >
      <CopyIcon size={16} /> <span aria-live="polite">{copied ? 'Copied' : 'Copy email'}</span>
    </button>
  )
}

/** The recruiter-friendly, conventional one-page portfolio. Also the no-WebGL fallback. */
export function QuickView() {
  const setQuickView = useStore((s) => s.setQuickView)
  const webglFailed = useStore((s) => s.webglFailed)
  const setCoachOpen = useStore((s) => s.setCoachOpen)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [active, setActive] = useState<SectionKey | null>(null)
  const jump = useJump(root)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  // the nav follows the reader: whichever section crosses the upper third is current
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.qv as SectionKey)
      },
      { root: el, rootMargin: '-30% 0px -65% 0px' },
    )
    el.querySelectorAll('[data-qv]').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  const go = (id: string) => root.current?.querySelector(`#qv-${id}`)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <motion.div
      ref={root}
      className="calm fixed inset-0 z-40 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="document"
    >
      <header className="sticky top-0 z-10 border-b border-black/10 bg-charcoal/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3 pb-1 md:px-5">
          <button className="text-lg font-semibold tracking-tight" onClick={() => root.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
            BDY<span className="text-cream">.</span>
          </button>
          <nav aria-label="Quick View sections" className="hidden gap-1 text-sm md:flex">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                aria-current={active === s.id ? 'location' : undefined}
                className={`relative px-2.5 py-1 transition-colors ${active === s.id ? 'text-ink' : 'text-silver hover:text-ink'}`}
              >
                {s.nav}
                {active === s.id && <motion.span layoutId="qv-nav" className="absolute inset-x-2.5 -bottom-0.5 h-0.5 bg-[#990000]" />}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <a className="btn btn-ghost !py-2" href={profile.resumeUrl} download>
              <DownloadIcon size={15} /> Resume
            </a>
            {!webglFailed && (
              <button className="btn btn-calm !py-2" onClick={() => setQuickView(false)}>
                <StadiumIcon size={16} /> <span className="sm:hidden">Stadium</span>
                <span className="hidden sm:inline">Enter the stadium</span>
              </button>
            )}
          </div>
        </div>
        <PitchProgress container={root} />
      </header>

      <main className="mx-auto max-w-5xl overflow-x-hidden px-4 md:px-5">
        {webglFailed && (
          <p className="mt-6 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-silver" role="note">
            Your browser or device couldn't start the 3D stadium, so here's the full portfolio in classic form. Nothing is missing.
          </p>
        )}

        <section className="relative grid items-center gap-10 py-14 md:grid-cols-[1fr_auto]" aria-labelledby="qv-name">
          {/* his number, big and faint, like the back of a shirt */}
          <span
            className="pointer-events-none absolute right-0 top-0 select-none text-[13rem] font-black leading-none text-[#990000]/[0.05] md:text-[22rem]"
            aria-hidden
          >
            13
          </span>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="relative">
            <p className="kicker">Quick View · BDY's World</p>
            <h1
              id="qv-name"
              ref={heading}
              tabIndex={-1}
              className="mt-3 text-[clamp(2rem,6.5vw,3.25rem)] font-semibold leading-tight tracking-tight outline-none [overflow-wrap:anywhere]"
            >
              {profile.name}
            </h1>
            <p className="mt-4 text-lg italic text-silver md:text-xl">“{profile.tagline}”</p>
            <p className="mt-2 text-sm text-silver-dim">{profile.roles.join(' · ')}</p>
            <p className="mt-5 max-w-xl text-silver">
              {education.degree} ({education.specialization}) with minors in {education.minors.join(' and ')} at {education.school}. {profile.availability}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a className="btn btn-calm max-w-full" href={`mailto:${profile.email}`}>
                <MailIcon size={16} /> <span className="truncate">{profile.email}</span>
              </a>
              <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
                <LinkedinIcon size={16} /> LinkedIn
              </a>
              <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">
                <GithubIcon size={16} /> GitHub
              </a>
              <button className="btn btn-ghost" onClick={() => setCoachOpen(true)}>
                <WhistleIcon size={16} /> Ask the Coach
              </button>
            </div>
          </motion.div>
          <motion.img
            initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            className="relative mx-auto w-56 rounded-md object-cover shadow-[0_18px_40px_rgba(29,33,39,0.16)] ring-1 ring-black/10 md:w-72"
            width={288}
            height={304}
          />
        </section>

        <Section id="about">
          <div className="grid gap-8 md:grid-cols-2">
            <Rise className="space-y-4 text-silver">
              <p className="border-l-2 border-cream/60 pl-4 text-lg text-ink">“{profile.rugbyIntro}”</p>
              {profile.bio.map((p) => (
                <p key={p.slice(0, 16)}>{p}</p>
              ))}
            </Rise>
            <Rise delay={0.08} className="card rounded-md border border-black/10 bg-charcoal-2 p-5 text-sm">
              <p className="font-semibold text-ink">{education.school}</p>
              <p className="text-silver-dim">{education.college}</p>
              <ul className="mt-4 space-y-1.5 text-silver">
                <li>GPA {education.gpa}</li>
                <li>Honors: {education.honors.join(', ')}</li>
                <li>Coursework: {education.coursework.join(', ')}</li>
              </ul>
            </Rise>
          </div>
        </Section>

        <Section id="experience">
          <MatchLog />
        </Section>

        <Section id="projects">
          <Playbook />
        </Section>

        <Section id="skills">
          <TrainingGround jump={jump} />
        </Section>

        <Section id="leadership">
          <ul className="grid gap-4 md:grid-cols-2">
            {leadership.map((l, i) => (
              <li key={l.id}>
                <Rise delay={(i % 2) * 0.06} className="card flex h-full gap-4 rounded-md border border-black/8 bg-charcoal-2 p-5">
                  <Jersey n={l.number} />
                  <div>
                    <p className="font-semibold">{l.role}</p>
                    <p className="text-sm text-cream">{l.org}</p>
                    {l.period && <p className="mt-1 font-mono text-xs text-silver-dim">{l.period}</p>}
                    {l.description && <p className="mt-2 text-sm text-silver">{l.description}</p>}
                  </div>
                </Rise>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="contact">
          <Rise className="flex flex-wrap gap-2">
            <a className="btn btn-calm" href={`mailto:${profile.email}`}>
              <MailIcon size={16} /> Email me
            </a>
            <CopyEmail />
            <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
              <LinkedinIcon size={16} /> LinkedIn
            </a>
            <a className="btn btn-ghost" href={profile.resumeUrl} download>
              <DownloadIcon size={16} /> Download resume
            </a>
          </Rise>
        </Section>
      </main>
      <footer className="border-t border-black/10 py-8 text-center text-xs text-silver-dim">
        <Ball className="mx-auto mb-3 h-4 w-7 opacity-70" />© {new Date().getFullYear()} {profile.name} · {education.school}
      </footer>
    </motion.div>
  )
}
