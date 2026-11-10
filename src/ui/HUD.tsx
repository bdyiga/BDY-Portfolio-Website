import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { education, profile } from '../data/portfolio'
import { SECTIONS } from '../lib/sections'
import { useStore } from '../state/store'
import { CloseIcon, DownloadIcon, ListIcon, MenuIcon, MoonIcon, SunIcon, WhistleIcon } from './icons'

function LightsToggle({ className = '' }: { className?: string }) {
  const night = useStore((s) => s.night)
  const toggle = useStore((s) => s.toggleNight)
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={!night}
      aria-label={night ? 'Switch to day mode (N)' : 'Switch to night mode (N)'}
      title={night ? 'Day mode (N)' : 'Night mode (N)'}
      className={`bar-btn !px-0 w-10 justify-center ${className}`}
    >
      {night ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  )
}

function Menu() {
  const open = useStore((s) => s.menuOpen)
  const setOpen = useStore((s) => s.setMenuOpen)
  const openSection = useStore((s) => s.openSection)
  const closeSection = useStore((s) => s.closeSection)
  const section = useStore((s) => s.section)
  const setCoachOpen = useStore((s) => s.setCoachOpen)
  const setQuickView = useStore((s) => s.setQuickView)
  const reduced = useStore((s) => s.reducedMotion)
  const setReduced = useStore((s) => s.setReducedMotion)
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const night = useStore((s) => s.night)
  const toggleNight = useStore((s) => s.toggleNight)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label="Stadium navigation"
            className="slab scroll-area fixed right-0 top-0 bottom-0 z-50 w-[min(400px,100vw)] overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="slab-band flex items-center justify-between py-2 pl-5 pr-2">
              <p className="strap text-sm">Navigate the stadium</p>
              <button className="icon-btn !border-transparent !bg-transparent" onClick={() => setOpen(false)} aria-label="Close menu" autoFocus>
                <CloseIcon />
              </button>
            </div>
            <div className="p-5">
              <ul className="divide-y divide-white/8">
                <li>
                  <button
                    className={`flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-white/5 ${section === null ? 'text-cream' : 'text-silver'}`}
                    onClick={() => {
                      closeSection()
                      setOpen(false)
                    }}
                  >
                    <kbd className="w-5 font-mono text-xs text-silver-dim">0</kbd>
                    <span className="strap text-base">Stadium overview</span>
                  </button>
                </li>
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      className={`flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-white/5 ${section === s.id ? 'bg-white/[0.06]' : ''}`}
                      onClick={() => openSection(s.id)}
                      aria-current={section === s.id ? 'page' : undefined}
                    >
                      <kbd className={`w-5 font-mono text-xs ${section === s.id ? 'text-lime' : 'text-silver-dim'}`}>{s.key}</kbd>
                      <span>
                        <span className="strap block text-base">{s.title}</span>
                        <span className="block text-xs text-silver-dim">{s.blurb}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="btn btn-cream col-span-2 justify-center" onClick={() => setQuickView(true)}>
                  <ListIcon size={16} /> See everything on one page
                </button>
                <a className="btn btn-ghost justify-center" href={profile.resumeUrl} download>
                  <DownloadIcon size={16} /> Resume
                </a>
                <button className="btn btn-ghost justify-center" onClick={() => setCoachOpen(true)}>
                  <WhistleIcon size={16} /> Ask the Coach
                </button>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Night match</span>
                  <input type="checkbox" className="h-4 w-4 accent-lime" checked={night} onChange={toggleNight} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Reduce motion</span>
                  <input type="checkbox" className="h-4 w-4 accent-lime" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Battery saver (lower graphics)</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-lime"
                    checked={quality === 'low'}
                    onChange={(e) => setQuality(e.target.checked ? 'low' : 'high')}
                  />
                </label>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="kicker mb-3">Keyboard</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs text-silver">
                  <dt className="font-mono text-cream">1–6</dt>
                  <dd>Jump to a section</dd>
                  <dt className="font-mono text-cream">0 / Esc</dt>
                  <dd>Back to overview</dd>
                  <dt className="font-mono text-cream">← →</dt>
                  <dd>Previous / next item in a section</dd>
                  <dt className="font-mono text-cream">N</dt>
                  <dd>Toggle day / night</dd>
                  <dt className="font-mono text-cream">Q</dt>
                  <dd>Everything on one page</dd>
                  <dt className="font-mono text-cream">C</dt>
                  <dd>Ask the Coach</dd>
                  <dt className="font-mono text-cream">K</dt>
                  <dd>Take a shot at goal</dd>
                </dl>
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}

/** Score bug + the three things a recruiter wants, always in the same place. */
export function TopBar() {
  const closeSection = useStore((s) => s.closeSection)
  const openSection = useStore((s) => s.openSection)
  const setMenuOpen = useStore((s) => s.setMenuOpen)
  const setQuickView = useStore((s) => s.setQuickView)
  const setCoachOpen = useStore((s) => s.setCoachOpen)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 md:p-4">
      <div className="pointer-events-auto flex">
        <button
          onClick={closeSection}
          className="slab-band display grid h-10 place-items-center px-3 text-lg"
          aria-label="BDY's World: back to stadium overview"
        >
          BDY
        </button>
        <p className="strap hidden h-10 items-center bg-slab px-3 text-sm text-cream sm:flex">
          CS + AI <span className="mx-2 text-silver-dim">·</span> Class of {education.graduation.replace(/^\w+ /, '')}
        </p>
      </div>
      <nav aria-label="Quick links" className="pointer-events-auto flex gap-px">
        <a className="bar-btn" href={profile.resumeUrl} download>
          <DownloadIcon size={14} className="hidden sm:block" /> Resume
        </a>
        <button className="bar-btn" onClick={() => openSection('contact')}>
          Contact
        </button>
        <button className="bar-btn" onClick={() => setQuickView(true)} title="Everything on one page (Q)">
          <ListIcon size={14} className="hidden sm:block" /> One page
        </button>
        <button className="bar-btn !px-0 hidden w-10 justify-center md:inline-flex" onClick={() => setCoachOpen(true)} aria-label="Ask the Coach, the portfolio assistant (C)" title="Ask the Coach (C)">
          <WhistleIcon size={16} />
        </button>
        <LightsToggle className="hidden md:inline-flex" />
        <button className="bar-btn !px-0 w-10 justify-center" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu (M)">
          <MenuIcon size={18} />
        </button>
      </nav>
    </header>
  )
}

/** The rundown: every zone, numbered, in one fixed strip. Replaces the floating 3D labels. */
function Rundown() {
  const openSection = useStore((s) => s.openSection)
  const setHovered = useStore((s) => s.setHovered)
  const hovered = useStore((s) => s.hovered)
  return (
    <motion.nav
      aria-label="Stadium zones"
      className="fixed inset-x-3 bottom-3 z-20 md:inset-x-auto md:bottom-4 md:left-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="slab-band strap inline-block px-3 py-1 text-xs">The rundown</p>
      <ol className="slab grid grid-cols-2 md:flex">
        {SECTIONS.map((s) => (
          <li key={s.id} className="border-white/8 [&:not(:last-child)]:border-r max-md:border-b max-md:[&:nth-child(2n)]:border-r-0">
            <button
              onClick={() => openSection(s.id)}
              onPointerEnter={() => setHovered(s.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.id)}
              onBlur={() => setHovered(null)}
              className={`flex w-full items-baseline gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] md:px-4 ${hovered === s.id ? 'bg-white/[0.06]' : ''}`}
            >
              <span className={`font-mono text-xs ${hovered === s.id ? 'text-lime' : 'text-silver-dim'}`}>{s.key}</span>
              <span className="strap text-[0.95rem] text-ink">{s.title.replace('Technical ', '')}</span>
            </button>
          </li>
        ))}
      </ol>
    </motion.nav>
  )
}

export function HUD() {
  const section = useStore((s) => s.section)
  return (
    <>
      <TopBar />
      <AnimatePresence>{!section && <Rundown key="rundown" />}</AnimatePresence>
      <Menu />
    </>
  )
}

/** "Score flash": a small slab under the score bug, never over the panel. */
export function Toast() {
  const toast = useStore((s) => s.toast)
  const clear = useStore((s) => s.clearToast)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(clear, 5000)
    return () => window.clearTimeout(t)
  }, [toast, clear])
  return (
    <div className="pointer-events-none fixed left-3 top-16 z-50 w-[min(22rem,calc(100vw-1.5rem))] md:left-4 md:top-[4.5rem]" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="slab pointer-events-auto flex"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={clear}
            role="status"
          >
            <span className={`w-1.5 shrink-0 ${toast.tone === 'gold' ? 'bg-gold' : 'bg-crimson'}`} aria-hidden />
            <div className="px-4 py-3">
              <p className="strap text-base text-cream">{toast.title}</p>
              {toast.body && <p className="mt-0.5 whitespace-pre-line text-sm text-silver">{toast.body}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
