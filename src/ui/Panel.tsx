import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { SECTIONS, SECTION_BY_ID, type SectionId } from '../lib/sections'
import { useStore } from '../state/store'
import { ArrowLeft, ArrowRight, CloseIcon } from './icons'

/** Shared shell for all section panels: right drawer on desktop, bottom sheet on mobile. */
export function Panel({ id, children }: { id: SectionId; children: ReactNode }) {
  const meta = SECTION_BY_ID[id]
  const closeSection = useStore((s) => s.closeSection)
  const openSection = useStore((s) => s.openSection)
  const heading = useRef<HTMLHeadingElement>(null)
  const idx = SECTIONS.findIndex((s) => s.id === id)
  const prev = SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length]
  const next = SECTIONS[(idx + 1) % SECTIONS.length]

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [id])

  return (
    <motion.aside
      key={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`panel-title-${id}`}
      className="glass-strong fixed z-30 flex flex-col overflow-hidden
        inset-x-0 bottom-0 h-[64dvh] rounded-t-3xl
        md:inset-x-auto md:right-4 md:top-20 md:bottom-4 md:h-auto md:w-[min(500px,calc(100vw-2rem))] md:rounded-3xl"
      initial={{ opacity: 0, x: 40, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden />
      <header className="flex items-start justify-between gap-4 px-6 pt-4 pb-3 md:pt-6">
        <div>
          <p className="kicker">
            {meta.zone} · {meta.key}/{SECTIONS.length}
          </p>
          <h2 id={`panel-title-${id}`} ref={heading} tabIndex={-1} className="display mt-2 text-3xl md:text-4xl outline-none">
            {meta.title}
          </h2>
        </div>
        <button className="icon-btn shrink-0" onClick={closeSection} aria-label="Back to the stadium overview (Esc)" title="Back to field (Esc)">
          <CloseIcon />
        </button>
      </header>
      <div className="scroll-area flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-sm">
        <button className="btn btn-ghost !px-3" onClick={() => openSection(prev.id)} aria-label={`Previous: ${prev.title}`}>
          <ArrowLeft size={16} /> <span className="hidden sm:inline">{prev.title}</span>
        </button>
        <button className="btn btn-ghost !px-3" onClick={closeSection}>
          Back to field
        </button>
        <button className="btn btn-ghost !px-3" onClick={() => openSection(next.id)} aria-label={`Next: ${next.title}`}>
          <span className="hidden sm:inline">{next.title}</span> <ArrowRight size={16} />
        </button>
      </footer>
    </motion.aside>
  )
}

/** Staggered, animated tag list. */
export function Tags({ items, delay = 0 }: { items: string[]; delay?: number }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
      {items.map((t, i) => (
        <motion.li
          key={t}
          className="tag"
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: delay + i * 0.05, type: 'spring', stiffness: 400, damping: 24 }}
        >
          {t}
        </motion.li>
      ))}
    </ul>
  )
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
