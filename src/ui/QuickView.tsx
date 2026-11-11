import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react'
import { education, experiences, leadership, profile, projects, skillGroups, whereUsed } from '../data/portfolio'
import { cheer, thud, whistle } from '../lib/sound'
import { useStore } from '../state/store'
import { SoundToggle } from './HUD'
import { CloseIcon, CopyIcon, DownloadIcon, ExternalIcon, GithubIcon, LinkedinIcon, MailIcon, StadiumIcon, WhistleIcon } from './icons'

/**
 * The recruiter-friendly, conventional one-page portfolio (and the no-WebGL
 * fallback), laid out like a match programme: kick-off, match log, playbook,
 * training ground, team sheet, full time. Light and calm to read, with things
 * to touch: a match clock that runs as you scroll, project cards that open in
 * place, skills that light up the work that used them, a contact bar that stays
 * in reach, and a kick at goal at full time.
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
const CRIMSON = '#990000'

/** Which project and role cards a skill lights up: `null` when no skill is in focus. */
type Lit = Set<string> | null
const litKey = (kind: 'project' | 'experience', id: string) => `${kind}:${id}`
/** Lit cards get a crimson edge; the rest step back (a filter, since the cards animate their own opacity). */
const litClass = (lit: Lit, key: string) =>
  lit === null ? '' : lit.has(key) ? 'ring-2 ring-[#990000]/45 shadow-[0_8px_24px_rgba(153,0,0,0.12)]' : '[filter:opacity(0.35)_saturate(0.5)]'

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
    <section id={`qv-${id}`} data-qv={id} aria-labelledby={`qv-${id}-h`} className="scroll-mt-32 border-t border-black/10 py-16">
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

/** A rugby ball, drawn small. */
function Ball({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden>
      <BallShape />
    </svg>
  )
}
function BallShape() {
  return (
    <>
      <ellipse cx="16" cy="10" rx="15" ry="9" fill="#ffffff" stroke={CRIMSON} strokeWidth="1.6" />
      <path d="M9 10h14" stroke={CRIMSON} strokeWidth="1.4" />
      {[12, 15, 18, 21].map((x) => (
        <path key={x} d={`M${x - 1} 8.2v3.6`} stroke={CRIMSON} strokeWidth="1.2" />
      ))}
    </>
  )
}

/**
 * The match clock and the pitch: scrolling the page plays the 80 minutes, and
 * the ball is carried from try line to try line.
 */
function MatchClock({ container, active }: { container: React.RefObject<HTMLDivElement | null>; active: SectionKey | null }) {
  const { scrollYProgress } = useScroll({ container })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })
  const left = useTransform(p, (v) => `calc(${(v * 100).toFixed(2)}% - ${(v * 22).toFixed(1)}px)`)
  const fill = useTransform(p, (v) => `${(v * 100).toFixed(2)}%`)
  const [clock, setClock] = useState({ min: 0, half: '1st half' })
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const min = Math.min(80, Math.round(v * 80))
    const half = v > 0.985 ? 'Full time' : min >= 40 ? '2nd half' : '1st half'
    setClock((c) => {
      if (c.min === min && c.half === half) return c
      // the referee marks half time and full time (only if sound is on)
      if (half !== c.half && half !== '1st half') whistle(half === 'Full time' ? 3 : 2)
      return { min, half }
    })
  })
  const section = SECTIONS.find((s) => s.id === active)
  return (
    <div className="mx-auto flex h-6 max-w-5xl items-center gap-3 px-4 md:px-5">
      <p className="flex shrink-0 items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-wider text-silver" aria-hidden>
        <span className="rounded-sm bg-[#990000] px-1.5 py-px font-bold tabular-nums text-white">{String(clock.min).padStart(2, '0')}′</span>
        <span>{clock.half}</span>
        {section && <span className="hidden text-silver-dim sm:inline">· {section.label}</span>}
      </p>
      <div className="relative h-full flex-1" aria-hidden>
        {/* the field: try lines at the ends, the 22s and halfway between */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/10" />
        <motion.div className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#990000]/70" style={{ width: fill }} />
        {[0, 22, 50, 78, 100].map((x) => (
          <span key={x} className={`absolute top-1.5 bottom-1.5 w-px ${x === 0 || x === 100 ? 'bg-black/30' : 'bg-black/12'}`} style={{ left: `${x}%` }} />
        ))}
        <motion.div className="absolute top-1/2 -translate-y-1/2" style={{ left }}>
          <Ball className="h-3.5 w-[22px] drop-shadow-sm" />
        </motion.div>
      </div>
    </div>
  )
}

/** Counts up to a stat the first time it is seen ("12,000+", "25+"; "3–4h → 30m" just shows). */
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

function MatchLog({ lit }: { lit: Lit }) {
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
              <Rise
                delay={k * 0.05}
                className={`card relative rounded-md border border-black/8 bg-charcoal-2 p-5 transition-[opacity,box-shadow,filter] duration-300 ${litClass(lit, litKey('experience', e.id))}`}
              >
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

function Playbook({ lit }: { lit: Lit }) {
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
  const [openId, setOpenId] = useState<string | null>(null)
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
          {shown.map(({ p, i }) => {
            const open = openId === p.id
            const stack = p.stack ?? p.tags
            return (
              <motion.li
                layout
                key={p.id}
                id={`qv-proj-${p.id}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`card flex flex-col rounded-md border bg-charcoal-2 transition-[opacity,box-shadow,filter] duration-300 ${
                  open ? 'border-[#990000]/30 md:col-span-2' : 'border-black/8 hover:border-black/25'
                } ${litClass(lit, litKey('project', p.id))}`}
              >
                {/* the front of the card: the play, the title, one line. Click to open it in place */}
                <button
                  className="flex w-full items-start gap-3 p-5 text-left"
                  onClick={() => setOpenId(open ? null : p.id)}
                  aria-expanded={open}
                  aria-controls={`qv-proj-${p.id}-more`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs text-cream">
                      Play {String(i + 1).padStart(2, '0')} · {p.play}
                      {p.period ? <span className="text-silver-dim"> · {p.period}</span> : null}
                    </span>
                    <span className="mt-1 block text-lg font-bold text-ink">
                      {p.title}
                      {p.badge && (
                        <span className="ml-2 rounded border border-gold/50 px-1.5 py-0.5 align-middle text-[0.65rem] font-semibold text-gold">{p.badge}</span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-silver">{p.short}</span>
                    {!open && <span className="mt-3 block font-mono text-[0.7rem] text-silver-dim">{stack.slice(0, 4).join(' · ')}</span>}
                  </span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/15 text-lg leading-none text-silver"
                    aria-hidden
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`qv-proj-${p.id}-more`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-black/8 px-5 pt-4 pb-5">
                        {p.result && <p className="border-l-2 border-cream pl-2.5 text-sm font-semibold text-ink">{p.result}</p>}
                        <p className="mt-2 max-w-3xl text-sm text-silver">{p.description}</p>
                        {p.problem && (
                          <p className="mt-2 max-w-3xl text-sm text-silver">
                            <span className="font-semibold text-ink">The problem: </span>
                            {p.problem}
                          </p>
                        )}
                        {p.built && (
                          <p className="mt-2 max-w-3xl text-sm text-silver">
                            <span className="font-semibold text-ink">What I built: </span>
                            {p.built}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {stack.map((t) => (
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
                              <a
                                href={p.link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-cream hover:underline"
                              >
                                {p.link.label} <ExternalIcon size={14} />
                              </a>
                            )}
                            {p.github && (
                              <a
                                href={p.github}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-cream hover:underline"
                              >
                                <GithubIcon size={14} /> GitHub
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </>
  )
}

function TrainingGround({
  skill,
  setSkill,
  setPeek,
  jump,
}: {
  skill: string | null
  setSkill: (s: string | null) => void
  setPeek: (s: string | null) => void
  jump: (id: string) => void
}) {
  const used = skill ? whereUsed(skill) : []
  // hovering a skill previews what it lights up; only on screens with a real pointer
  const hoverable = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches
  return (
    <>
      <p className="text-sm text-silver">Tap a skill: the projects and roles that used it light up across the page.</p>
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
                    onPointerEnter={hoverable ? () => setPeek(s) : undefined}
                    onPointerLeave={hoverable ? () => setPeek(null) : undefined}
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
      <path d="M12 5l-9 6 4 8 4-2v19h18V17l4 2 4-8-9-6c-1 3-4 5-8 5s-7-2-8-5z" fill={CRIMSON} />
      <text x="20" y="29" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff" fontFamily="Inter, sans-serif">
        {n}
      </text>
    </svg>
  )
}

function useCopyEmail() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(profile.email).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      },
      () => undefined,
    )
  }, [])
  return { copied, copy }
}

function CopyEmail({ compact = false }: { compact?: boolean }) {
  const { copied, copy } = useCopyEmail()
  return (
    <button className={`btn btn-ghost ${compact ? '!px-3 !py-2' : ''}`} onClick={copy} aria-label={compact ? 'Copy email address' : undefined}>
      <CopyIcon size={16} />{' '}
      <span aria-live="polite" className={compact ? 'hidden sm:inline' : ''}>
        {copied ? 'Copied' : 'Copy email'}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Full time: a kick at goal                                           */
/* ------------------------------------------------------------------ */

const W = 640
const H = 230
const GROUND = 206
const TEE = { x: 70, y: GROUND - 12 }
const POST_X = 560
const BAR_Y = 140
const POST_TOP = 26
const G = 900
const MAX_V = 980

type Flight = { x: number; y: number; vx: number; vy: number; spin: number }
type KickState = 'ready' | 'aiming' | 'flying' | 'scored' | 'missed'

/** Where a kick with this launch velocity crosses the posts (null if it lands first). */
function crossing(vx: number, vy: number) {
  if (vx <= 0) return null
  const t = (POST_X - TEE.x) / vx
  const y = TEE.y + vy * t + 0.5 * G * t * t
  return y > GROUND ? null : y
}
const isGoal = (vx: number, vy: number) => {
  const y = crossing(vx, vy)
  return y !== null && y < BAR_Y && y > POST_TOP
}

/** Drag the ball back and let go: over the bar and between the posts is a conversion. */
function KickAtGoal({ onScore }: { onScore: () => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const reduced = useStore((s) => s.reducedMotion)
  const [state, setState] = useState<KickState>('ready')
  const [ball, setBall] = useState<Flight>({ x: TEE.x, y: TEE.y, vx: 0, vy: 0, spin: 0 })
  const [aim, setAim] = useState<{ vx: number; vy: number } | null>(null)
  const [points, setPoints] = useState(0)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const toSvg = (e: React.PointerEvent) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const launchFrom = (px: number, py: number) => {
    // pull back like a sling: the ball goes the other way, harder the further you pull
    let vx = (TEE.x - px) * 4.2
    let vy = (TEE.y - py) * 4.2
    const v = Math.hypot(vx, vy)
    if (v > MAX_V) {
      vx *= MAX_V / v
      vy *= MAX_V / v
    }
    return { vx, vy }
  }

  const finish = (scored: boolean) => {
    setState(scored ? 'scored' : 'missed')
    if (scored) {
      cheer()
      setPoints((n) => n + 2)
      onScore()
    }
    window.setTimeout(() => {
      setBall({ x: TEE.x, y: TEE.y, vx: 0, vy: 0, spin: 0 })
      setState((s) => (s === 'scored' || s === 'missed' ? 'ready' : s))
    }, 1700)
  }

  const kick = (vx: number, vy: number) => {
    if (vx < 40) return setState('ready')
    const scored = isGoal(vx, vy)
    thud()
    if (reduced) return finish(scored)
    setState('flying')
    let f: Flight = { x: TEE.x, y: TEE.y, vx, vy, spin: 0 }
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      f = { x: f.x + f.vx * dt, y: f.y + f.vy * dt + 0.5 * G * dt * dt, vx: f.vx, vy: f.vy + G * dt, spin: f.spin + dt * 720 }
      setBall(f)
      if (f.y >= GROUND - 6 || f.x > W + 20) return finish(scored)
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }

  // the dotted flight path while aiming
  const preview = aim
    ? Array.from({ length: 10 }, (_, k) => {
        const t = (k + 1) * 0.09
        return { x: TEE.x + aim.vx * t, y: TEE.y + aim.vy * t + 0.5 * G * t * t }
      }).filter((p) => p.y < GROUND)
    : []

  const message =
    state === 'scored'
      ? 'Over the bar and between the posts. Conversion, +2!'
      : state === 'missed'
        ? 'Not this time. Have another go.'
        : state === 'flying'
          ? '…'
          : 'Fancy a kick? Drag the ball back, aim, and let go.'

  return (
    <div className="card mt-8 max-w-2xl rounded-md border border-black/8 bg-charcoal-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold" aria-live="polite">
          {message}
        </p>
        <p className="shrink-0 font-mono text-xs text-silver-dim">
          Score <span className="font-bold text-ink tabular-nums">{points}</span>
        </p>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-none select-none"
        role="img"
        aria-label="A kicking tee on the left and the goalposts on the right. Drag the ball back and release to kick."
        onPointerDown={(e) => {
          if (state !== 'ready') return
          const p = toSvg(e)
          if (Math.hypot(p.x - TEE.x, p.y - TEE.y) > 70) return
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          setState('aiming')
          setAim(launchFrom(p.x, p.y))
        }}
        onPointerMove={(e) => {
          if (state !== 'aiming') return
          const p = toSvg(e)
          setAim(launchFrom(p.x, p.y))
        }}
        onPointerUp={() => {
          if (state !== 'aiming' || !aim) return
          setAim(null)
          kick(aim.vx, aim.vy)
        }}
        onPointerCancel={() => {
          setAim(null)
          setState('ready')
        }}
      >
        {/* grass, the try line and the in-goal */}
        <rect x="0" y={GROUND} width={W} height={H - GROUND} fill="#e7efe3" />
        <line x1="0" x2={W} y1={GROUND} y2={GROUND} stroke="#b9cbb3" />
        {/* the posts, side on: upright, with the crossbar seen end-on */}
        <line x1={POST_X} x2={POST_X} y1={POST_TOP} y2={GROUND} stroke="#2a2f36" strokeWidth="5" strokeLinecap="round" />
        <line x1={POST_X - 16} x2={POST_X + 16} y1={BAR_Y} y2={BAR_Y} stroke="#2a2f36" strokeWidth="5" strokeLinecap="round" />
        <rect x={POST_X - 7} y={GROUND - 30} width="14" height="30" rx="2" fill={CRIMSON} opacity="0.85" />
        {/* the tee */}
        <path d={`M${TEE.x - 9} ${GROUND} L${TEE.x - 4} ${GROUND - 6} H${TEE.x + 4} L${TEE.x + 9} ${GROUND} Z`} fill="#d9d4cb" />
        {preview.map((p, k) => (
          <circle key={k} cx={p.x} cy={p.y} r={2.2} fill={CRIMSON} opacity={0.55 - k * 0.04} />
        ))}
        {/* the pull-back band */}
        {state === 'aiming' && aim && (
          <line x1={TEE.x} y1={TEE.y} x2={TEE.x - aim.vx / 4.2} y2={TEE.y - aim.vy / 4.2} stroke="#2a2f36" strokeOpacity="0.35" strokeDasharray="4 4" />
        )}
        <g
          transform={`translate(${ball.x - 16} ${ball.y - 10}) rotate(${state === 'flying' ? ball.spin : -18} 16 10)`}
          className={state === 'ready' ? 'cursor-grab' : ''}
        >
          <BallShape />
        </g>
        <AnimatePresence>
          {state === 'scored' && (
            <motion.text
              x={POST_X}
              y={POST_TOP - 6}
              textAnchor="middle"
              fontSize="16"
              fontWeight="800"
              fill={CRIMSON}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              +2
            </motion.text>
          )}
        </AnimatePresence>
      </svg>
      <div className="mt-2 flex justify-end">
        <button className="text-xs font-semibold text-cream hover:underline disabled:opacity-40" disabled={state !== 'ready'} onClick={() => kick(560, -560)}>
          Kick for me
        </button>
      </div>
    </div>
  )
}

/** Slides up once the hero is gone: the ways to reach him, never more than a tap away. Hides at full time. */
function HireBar({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-3 z-20 flex justify-center px-3"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/95 py-1.5 pr-1.5 pl-4 shadow-[0_10px_30px_rgba(29,33,39,0.16)] backdrop-blur">
            <p className="hidden text-sm text-silver md:block">
              <span className="font-semibold text-ink">{profile.shortName}</span> · CS + AI, class of {education.graduation.replace(/^\w+ /, '')}
            </p>
            <a className="btn btn-calm !rounded-full !py-2" href={`mailto:${profile.email}`}>
              <MailIcon size={15} /> Email
            </a>
            <CopyEmail compact />
            <a className="btn btn-ghost !rounded-full !px-3 !py-2" href={profile.resumeUrl} download>
              <DownloadIcon size={15} /> <span className="hidden sm:inline">Resume</span>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The recruiter-friendly, conventional one-page portfolio. Also the no-WebGL fallback. */
export function QuickView() {
  const setQuickView = useStore((s) => s.setQuickView)
  const webglFailed = useStore((s) => s.webglFailed)
  const setCoachOpen = useStore((s) => s.setCoachOpen)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const hero = useRef<HTMLElement>(null)
  const emailCta = useRef<HTMLAnchorElement>(null)
  const [active, setActive] = useState<SectionKey | null>(null)
  const [pastHero, setPastHero] = useState(false)
  // a skill tapped in the training ground (pinned), or hovered (a preview)
  const [skill, setSkill] = useState<string | null>(null)
  const [peek, setPeek] = useState<string | null>(null)
  const focus = peek ?? skill
  const lit: Lit = useMemo(() => (focus ? new Set(whereUsed(focus).map((u) => litKey(u.kind, u.id))) : null), [focus])
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
    const heroIo = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { root: el, threshold: 0 })
    if (hero.current) heroIo.observe(hero.current)
    return () => {
      io.disconnect()
      heroIo.disconnect()
    }
  }, [])

  const go = (id: string) => root.current?.querySelector(`#qv-${id}`)?.scrollIntoView({ behavior: 'smooth' })
  const celebrate = () =>
    emailCta.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 600, iterations: 2 })

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
            <SoundToggle className="!h-auto rounded border border-black/15 !bg-white !text-ink" />
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
        <MatchClock container={root} active={active} />
        {/* while a skill is pinned, say what the lit cards mean and how to clear it */}
        <AnimatePresence>
          {skill && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pb-2 text-sm md:px-5">
                <span className="text-silver">
                  Lit up: the work that used <span className="font-semibold text-ink">{skill}</span>
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2 py-0.5 text-xs text-silver hover:border-black/40"
                  onClick={() => setSkill(null)}
                >
                  <CloseIcon size={12} /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-5xl overflow-x-hidden px-4 md:px-5">
        {webglFailed && (
          <p className="mt-6 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-silver" role="note">
            Your browser or device couldn't start the 3D stadium, so here's the full portfolio in classic form. Nothing is missing.
          </p>
        )}

        <section ref={hero} className="relative grid items-center gap-10 py-14 md:grid-cols-[1fr_auto]" aria-labelledby="qv-name">
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
          <MatchLog lit={lit} />
        </Section>

        <Section id="projects">
          <Playbook lit={lit} />
        </Section>

        <Section id="skills">
          <TrainingGround skill={skill} setSkill={setSkill} setPeek={setPeek} jump={jump} />
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
            <a ref={emailCta} className="btn btn-calm" href={`mailto:${profile.email}`}>
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
          <KickAtGoal onScore={celebrate} />
        </Section>
      </main>
      <footer className="border-t border-black/10 py-8 text-center text-xs text-silver-dim">
        <Ball className="mx-auto mb-3 h-4 w-7 opacity-70" />© {new Date().getFullYear()} {profile.name} · {education.school}
      </footer>
      <HireBar show={pastHero && active !== 'contact'} />
    </motion.div>
  )
}
