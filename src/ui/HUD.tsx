import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { profile } from '../data/portfolio'
import { SECTIONS } from '../lib/sections'
import { useStore } from '../state/store'
import { CloseIcon, DownloadIcon, ListIcon, MenuIcon, MoonIcon, SunIcon, WhistleIcon } from './icons'
import { Minimap } from './Minimap'

function LightsToggle() {
  const night = useStore((s) => s.night)
  const toggle = useStore((s) => s.toggleNight)
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={!night}
      aria-label={night ? 'Switch to day mode (N)' : 'Switch to night mode (N)'}
      title={night ? 'Day mode (N)' : 'Night mode (N)'}
      className="glass relative flex h-10 w-[4.6rem] items-center rounded-full p-1"
    >
      <motion.span
        className="grid h-8 w-8 place-items-center rounded-full bg-lime text-charcoal"
        animate={{ x: night ? 0 : 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {night ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </motion.span>
      <span className="sr-only">{night ? 'Night' : 'Day'}</span>
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label="Stadium navigation"
            className="glass-strong scroll-area fixed right-3 top-3 bottom-3 z-50 w-[min(400px,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl p-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <p className="kicker">Navigate the stadium</p>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu" autoFocus>
                <CloseIcon />
              </button>
            </div>
            <ul className="mt-5 space-y-1">
              <li>
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5 ${section === null ? 'text-lime' : ''}`}
                  onClick={() => {
                    closeSection()
                    setOpen(false)
                  }}
                >
                  <kbd className="hotspot-key !bg-white/10 !text-ink">0</kbd>
                  <span>
                    <span className="block font-semibold">Stadium Overview</span>
                    <span className="block text-xs text-silver-dim">The whole pitch from above</span>
                  </span>
                </button>
              </li>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5 ${section === s.id ? 'bg-lime/10' : ''}`}
                    onClick={() => openSection(s.id)}
                    aria-current={section === s.id ? 'page' : undefined}
                  >
                    <kbd className="hotspot-key">{s.key}</kbd>
                    <span>
                      <span className="block font-semibold">{s.title}</span>
                      <span className="block text-xs text-silver-dim">
                        {s.zone} · {s.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="btn btn-ghost justify-center" onClick={() => setCoachOpen(true)}>
                <WhistleIcon size={16} /> Ask the Coach
              </button>
              <a className="btn btn-ghost justify-center" href={profile.resumeUrl} download>
                <DownloadIcon size={16} /> Resume
              </a>
              <button className="btn btn-lime col-span-2 justify-center" onClick={() => setQuickView(true)}>
                <ListIcon size={16} /> Quick View: classic one-page portfolio
              </button>
            </div>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
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
                <dt className="font-mono text-lime">1–6</dt>
                <dd>Jump to a section</dd>
                <dt className="font-mono text-lime">0 / Esc</dt>
                <dd>Back to overview</dd>
                <dt className="font-mono text-lime">← →</dt>
                <dd>Previous / next item in a section</dd>
                <dt className="font-mono text-lime">N</dt>
                <dd>Toggle day / night</dd>
                <dt className="font-mono text-lime">Q</dt>
                <dd>Quick View</dd>
                <dt className="font-mono text-lime">C</dt>
                <dd>Ask the Coach</dd>
                <dt className="font-mono text-lime">K</dt>
                <dd>Take a shot at goal</dd>
              </dl>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}

export function HUD() {
  const section = useStore((s) => s.section)
  const closeSection = useStore((s) => s.closeSection)
  const setMenuOpen = useStore((s) => s.setMenuOpen)
  const setQuickView = useStore((s) => s.setQuickView)
  const setCoachOpen = useStore((s) => s.setCoachOpen)
  const coachOpen = useStore((s) => s.coachOpen)
  const interacted = useStore((s) => s.interacted)

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 md:p-4">
        <button
          onClick={closeSection}
          className="glass display pointer-events-auto grid h-10 place-items-center rounded-full px-4 text-lg"
          aria-label="BDY's World: back to stadium overview"
        >
          <span>
            BDY<span className="text-lime">.</span>
          </span>
        </button>
        <div className="pointer-events-auto flex items-center gap-2">
          <LightsToggle />
          <button className="btn btn-ghost glass !h-10" onClick={() => setQuickView(true)} title="Quick View (Q)">
            <ListIcon size={16} />
            <span className="hidden sm:inline">Quick View</span>
          </button>
          <button className="icon-btn glass" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu (M)">
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* desktop overview only: on phones the hotspot labels already do this job */}
      {!section && (
        <div className="fixed bottom-4 left-4 z-20 hidden md:block">
          <Minimap />
        </div>
      )}

      <AnimatePresence>
        {!interacted && !section && (
          <motion.p
            className="glass pointer-events-none fixed bottom-6 left-1/2 z-20 hidden -translate-x-1/2 rounded-full px-5 py-2.5 text-center text-xs text-silver md:block"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
          >
            <span className="text-ink">Drag</span> to look around · <span className="text-ink">Scroll</span> to zoom · Click a{' '}
            <span className="text-lime">glowing marker</span> or press <span className="text-ink">1–6</span>
          </motion.p>
        )}
      </AnimatePresence>

      {!coachOpen && (
        <motion.button
          className={`btn btn-lime fixed bottom-4 right-4 z-30 !py-3 shadow-lg ${section ? 'hidden md:inline-flex' : ''}`}
          onClick={() => setCoachOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          aria-label="Ask the Coach, the portfolio assistant (C)"
          style={section ? { right: 'calc(min(500px, 100vw - 2rem) + 2rem)' } : undefined}
        >
          <WhistleIcon /> Ask the Coach
        </motion.button>
      )}

      <Menu />
    </>
  )
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  const clear = useStore((s) => s.clearToast)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(clear, 5600)
    return () => window.clearTimeout(t)
  }, [toast, clear])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className={`glass-strong pointer-events-auto max-w-md rounded-2xl px-5 py-4 shadow-2xl ${toast.tone === 'gold' ? 'border-gold/50' : 'border-lime/40'}`}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={clear}
            role="status"
          >
            <p className={`display text-lg ${toast.tone === 'gold' ? 'text-gold' : 'text-lime'}`}>{toast.title}</p>
            {toast.body && <p className="mt-1 whitespace-pre-line text-sm text-silver">{toast.body}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
