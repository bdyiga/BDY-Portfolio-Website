import { useState } from 'react'
import { motion } from 'motion/react'
import { profile } from '../../data/portfolio'
import { useStore } from '../../state/store'
import { BallIcon, CopyIcon, DownloadIcon, GithubIcon, LinkedinIcon, MailIcon } from '../icons'
import { Panel, Reveal } from '../Panel'

export function ContactPanel() {
  const conversions = useStore((s) => s.conversions)
  const kick = useStore((s) => s.kick)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked; the mailto link still works */
    }
  }

  const links = [
    { href: `mailto:${profile.email}`, label: 'Email', value: profile.email, icon: <MailIcon /> },
    { href: profile.linkedin, label: 'LinkedIn', value: 'linkedin.com/in/bdyiga', icon: <LinkedinIcon /> },
    { href: profile.github, label: 'GitHub', value: 'github.com/bdyiga', icon: <GithubIcon /> },
  ]

  return (
    <Panel id="contact">
      <Reveal>
        <h3 className="display text-[2.1rem] leading-[0.95] md:text-[2.5rem]">
          Let's build something <span className="text-lime">great</span> together.
        </h3>
        <p className="mt-4 text-silver">{profile.availability}</p>
      </Reveal>

      <ul className="mt-6 space-y-2">
        {links.map((l, i) => (
          <motion.li key={l.label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <a
              href={l.href}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-lime/60"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-lime">{l.icon}</span>
              <span className="flex-1">
                <span className="block text-xs uppercase tracking-widest text-silver-dim">{l.label}</span>
                <span className="block font-medium group-hover:text-lime">{l.value}</span>
              </span>
            </a>
          </motion.li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn btn-lime" href={profile.resumeUrl} download>
          <DownloadIcon size={16} /> Download resume
        </a>
        <a className="btn btn-ghost" href={profile.resumeUrl} target="_blank" rel="noreferrer">
          View PDF
        </a>
        <button className="btn btn-ghost" onClick={copy} aria-live="polite">
          <CopyIcon size={16} /> {copied ? 'Email copied!' : 'Copy email'}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-lime/25 bg-forest/40 p-4">
        <div>
          <p className="kicker">Kicking practice</p>
          <p className="mt-1 text-sm text-silver">
            {conversions === 0 ? 'Every visit to the posts starts with a conversion.' : `Conversions this visit: ${conversions}`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={kick} aria-label="Kick another conversion (K)">
          <BallIcon size={16} /> Kick again
        </button>
      </div>
    </Panel>
  )
}
