import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { profile } from '../data/portfolio'
import { useStore } from '../state/store'
import { ArrowRight, ListIcon } from './icons'

const nameParts = ['Benedict', 'Deogratius', 'Yiga']

export function Intro() {
  const phase = useStore((s) => s.phase)
  const reduced = useStore((s) => s.reducedMotion)
  const setPhase = useStore((s) => s.setPhase)
  const setQuickView = useStore((s) => s.setQuickView)
  const enterBtn = useRef<HTMLButtonElement>(null)
  const leaving = phase === 'entering'

  // timings follow the camera dolly + floodlight sequence
  const d = (s: number) => (reduced ? 0 : s)

  useEffect(() => {
    const t = window.setTimeout(() => enterBtn.current?.focus({ preventScroll: true }), d(3800) * 1)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enter = () => setPhase('entering')
  const skip = () => setPhase('world')

  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-10"
      aria-label="Introduction"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* vignette for legibility */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_60%,rgba(2,6,4,0.55),transparent_65%)]" aria-hidden />

      <div className="pointer-events-auto flex items-start justify-between gap-4">
        <motion.p
          className="kicker text-silver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: d(0.4), duration: 1 }}
        >
          <span className="text-lime">BDY's World</span>
          <span className="text-silver-dim"> / Beyond the Try Line</span>
        </motion.p>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setQuickView(true)}>
            <ListIcon size={16} /> <span>Quick View</span>
          </button>
          <button className="btn btn-ghost" onClick={skip}>
            Skip intro
          </button>
        </div>
      </div>

      <div className="max-w-5xl">
        <h1 className="display text-[clamp(2.8rem,9vw,7.5rem)] text-ink" aria-label={profile.name}>
          {nameParts.map((part, i) => (
            <span key={part} className="block overflow-hidden pb-1">
              <motion.span
                className={`block ${i === 2 ? 'text-lime' : ''}`}
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ delay: d(2.2 + i * 0.16), duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {part}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="mt-5 font-display text-xl font-extrabold italic tracking-tight text-ink [font-stretch:110%] md:text-3xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: d(3.0), duration: 0.8 }}
        >
          “{profile.tagline}”
        </motion.p>
        <motion.p
          className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-silver md:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: d(3.3), duration: 0.8 }}
        >
          {profile.roles.join('  |  ')}
        </motion.p>
        <motion.div
          className="pointer-events-auto mt-8 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: d(3.6), duration: 0.7 }}
        >
          <button ref={enterBtn} onClick={enter} disabled={leaving} className="btn btn-lime group !px-7 !py-4 text-base font-bold tracking-wide">
            ENTER MY WORLD
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="max-w-xs text-xs text-silver-dim">
            Recruiter in a hurry? <strong className="text-silver">Quick View</strong> has everything on one clean page.
          </p>
        </motion.div>
      </div>
    </motion.section>
  )
}

export function Loader() {
  const setQuickView = useStore((s) => s.setQuickView)
  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-[#020403]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      role="status"
      aria-live="polite"
    >
      <div className="w-[min(340px,80vw)] text-center">
        <p className="display text-3xl">
          BDY<span className="text-lime">.</span>
        </p>
        <p className="mt-4 kicker">Warming up the floodlights</p>
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="loader-bar absolute inset-y-0 w-2/5 rounded-full bg-lime" />
        </div>
        <p className="mt-4 text-xs text-silver-dim">Building the stadium in your browser. Nothing heavy to download.</p>
        <button className="btn btn-ghost mt-6" onClick={() => setQuickView(true)}>
          <ListIcon size={16} /> Open Quick View instead
        </button>
      </div>
    </motion.div>
  )
}
