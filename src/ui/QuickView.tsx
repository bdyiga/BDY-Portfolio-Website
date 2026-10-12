import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { education, experiences, leadership, profile, projects, skillGroups } from '../data/portfolio'
import { useStore } from '../state/store'
import { DownloadIcon, ExternalIcon, GithubIcon, LinkedinIcon, MailIcon, StadiumIcon, WhistleIcon } from './icons'

const NAV = [
  ['about', 'About'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['skills', 'Skills'],
  ['leadership', 'Leadership'],
  ['contact', 'Contact'],
] as const

function Section({ id, title, kicker, children }: { id: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={`qv-${id}`} aria-labelledby={`qv-${id}-h`} className="scroll-mt-24 border-t border-white/10 py-14">
      <p className="kicker">{kicker}</p>
      <h2 id={`qv-${id}-h`} className="display mt-2 text-3xl md:text-4xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  )
}

/** The recruiter-friendly, conventional one-page portfolio. Also the no-WebGL fallback. */
export function QuickView() {
  const setQuickView = useStore((s) => s.setQuickView)
  const webglFailed = useStore((s) => s.webglFailed)
  const setCoachOpen = useStore((s) => s.setCoachOpen)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  const go = (id: string) => root.current?.querySelector(`#qv-${id}`)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <motion.div
      ref={root}
      className="pitch-lines fixed inset-0 z-40 overflow-y-auto bg-charcoal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="document"
    >
      <header className="sticky top-0 z-10 border-b border-white/10 bg-charcoal/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <button className="display text-lg" onClick={() => root.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
            BDY<span className="text-lime">.</span>
          </button>
          <nav aria-label="Quick View sections" className="hidden gap-5 text-sm text-silver md:flex">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className="hover:text-lime">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex gap-2">
            <a className="btn btn-ghost !py-2" href={profile.resumeUrl} download>
              <DownloadIcon size={15} /> <span className="hidden sm:inline">Resume</span>
            </a>
            {!webglFailed && (
              <button className="btn btn-lime !py-2" onClick={() => setQuickView(false)}>
                <StadiumIcon size={16} /> <span className="hidden sm:inline">Enter the stadium</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {webglFailed && (
          <p className="mt-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-silver" role="note">
            Your browser or device couldn't start the 3D stadium, so here's the full portfolio in classic form. Nothing is missing.
          </p>
        )}

        <section className="grid items-center gap-10 py-14 md:grid-cols-[1fr_auto]" aria-labelledby="qv-name">
          <div>
            <p className="kicker">Quick View · BDY's World</p>
            <h1 id="qv-name" ref={heading} tabIndex={-1} className="display mt-3 text-5xl outline-none md:text-7xl">
              {profile.name}
            </h1>
            <p className="mt-5 font-display text-xl font-extrabold italic [font-stretch:110%] md:text-2xl">“{profile.tagline}”</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-silver">{profile.roles.join('  |  ')}</p>
            <p className="mt-5 max-w-xl text-silver">
              {education.degree} ({education.specialization}) with minors in {education.minors.join(' and ')} at {education.school}. {profile.availability}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a className="btn btn-lime" href={`mailto:${profile.email}`}>
                <MailIcon size={16} /> {profile.email}
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
          </div>
          <img
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            className="mx-auto w-56 rounded-3xl object-cover ring-1 ring-lime/40 md:w-72"
            width={288}
            height={304}
          />
        </section>

        <Section id="about" kicker="Center Field" title="About & Education">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4 text-silver">
              <p className="border-l-2 border-lime pl-4 text-lg text-ink">“{profile.rugbyIntro}”</p>
              {profile.bio.map((p) => (
                <p key={p.slice(0, 16)}>{p}</p>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-forest/30 p-5 text-sm">
              <p className="font-semibold text-ink">{education.school}</p>
              <p className="text-silver-dim">{education.college}</p>
              <ul className="mt-4 space-y-1.5 text-silver">
                <li>{education.degree}, {education.specialization}</li>
                <li>Minors: {education.minors.join(', ')}</li>
                <li>
                  GPA {education.gpa} · Graduating {education.graduation}
                </li>
                <li>Honors: {education.honors.join(', ')}</li>
                <li>Certification: {education.certifications.join(', ')}</li>
                <li>Coursework: {education.coursework.join(', ')}</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="experience" kicker="Right Try Zone" title="Experience">
          <ol className="space-y-5">
            {experiences
              .slice()
              .reverse()
              .map((e) => (
                <li key={e.id} className="rounded-2xl border border-white/10 bg-charcoal-2/70 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold">
                      {e.role} · <span className="text-lime">{e.company}</span>
                    </h3>
                    <p className="font-mono text-xs text-silver-dim">
                      {e.start} – {e.end} · {e.location}
                    </p>
                  </div>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-silver marker:text-lime">
                    {e.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-ink">
                    {e.achievements.map((a) => `${a.value} ${a.label}`).join(' · ')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.tech.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
          </ol>
        </Section>

        <Section id="projects" kicker="Left Try Zone · The Playbook" title="Projects">
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((p, i) => (
              <li key={p.id} className="flex flex-col rounded-2xl border border-white/10 bg-charcoal-2/70 p-5">
                <p className="font-mono text-xs text-lime">
                  Play {String(i + 1).padStart(2, '0')}
                  {p.period ? ` · ${p.period}` : ''}
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  {p.title} {p.badge && <span className="ml-1 rounded bg-gold px-1.5 py-0.5 align-middle text-[0.65rem] font-bold text-charcoal">{p.badge}</span>}
                </h3>
                <p className="mt-2 flex-1 text-sm text-silver">{p.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {p.link && (
                    <a href={p.link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lime hover:underline">
                      {p.link.label} <ExternalIcon size={14} />
                    </a>
                  )}
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lime hover:underline">
                      <GithubIcon size={14} /> GitHub
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="skills" kicker="Training Ground" title="Technical Skills">
          <dl className="grid gap-4 md:grid-cols-2">
            {skillGroups.map((g) => (
              <div key={g.id} className="rounded-2xl border border-white/10 bg-charcoal-2/70 p-5">
                <dt className="font-semibold">{g.name}</dt>
                <dd className="mt-3 flex flex-wrap gap-1.5">
                  {g.skills.map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-silver">{education.certifications[0]}</p>
        </Section>

        <Section id="leadership" kicker="North Stand · The Team Sheet" title="Leadership & Involvement">
          <ul className="grid gap-4 md:grid-cols-2">
            {leadership.map((l) => (
              <li key={l.id} className="rounded-2xl border border-white/10 bg-charcoal-2/70 p-5">
                <p className="font-semibold">{l.role}</p>
                <p className="text-sm text-lime">{l.org}</p>
                {l.period && <p className="mt-1 font-mono text-xs text-silver-dim">{l.period}</p>}
                {l.description && <p className="mt-2 text-sm text-silver">{l.description}</p>}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="contact" kicker="Goalposts" title="Let's build something great together.">
          <p className="max-w-2xl text-silver">{profile.availability}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-lime" href={`mailto:${profile.email}`}>
              <MailIcon size={16} /> {profile.email}
            </a>
            <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
              <LinkedinIcon size={16} /> linkedin.com/in/bdyiga
            </a>
            <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">
              <GithubIcon size={16} /> github.com/bdyiga
            </a>
            <a className="btn btn-ghost" href={profile.resumeUrl} download>
              <DownloadIcon size={16} /> Download resume
            </a>
          </div>
        </Section>
      </main>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-silver-dim">
        © {new Date().getFullYear()} {profile.name} · Indiana University Bloomington · Class of 2027
      </footer>
    </motion.div>
  )
}
