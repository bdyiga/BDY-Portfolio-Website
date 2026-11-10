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
  const body = useRef<HTMLDivElement>(null)
  const item = useStore((s) => s.item[id])
  const collapsed = useStore((s) => s.sheetCollapsed)
  const setCollapsed = useStore((s) => s.setSheetCollapsed)
  const idx = SECTIONS.findIndex((s) => s.id === id)
  const prev = SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length]
  const next = SECTIONS[(idx + 1) % SECTIONS.length]

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [id])

  // a new pick shows its detail at the top of the panel, inside the phone sheet
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [item])

  return (
    <motion.aside
      key={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`panel-title-${id}`}
      className={`slab fixed z-30 flex flex-col overflow-hidden
        inset-x-0 bottom-0 transition-[height] duration-300 ${collapsed ? 'h-[19dvh]' : 'h-[50dvh]'}
        md:inset-x-auto md:right-4 md:top-[4.5rem] md:bottom-4 md:h-auto md:w-[min(500px,calc(100vw-2rem))]`}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="slab-band flex items-center justify-between gap-3 py-2 pl-5 pr-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-mono text-xs text-cream/70">
            {meta.key}/{SECTIONS.length}
          </span>
          <h2 id={`panel-title-${id}`} ref={heading} tabIndex={-1} className="strap truncate text-xl outline-none md:text-2xl">
            {meta.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center">
          {/* phone only: shrink the sheet to watch #13 on the field */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="strap px-2 text-xs text-cream/80 md:hidden"
          >
            {collapsed ? 'Show details' : 'Show field'}
          </button>
          <button className="icon-btn !border-transparent !bg-transparent" onClick={closeSection} aria-label="Back to the stadium overview (Esc)" title="Back to field (Esc)">
            <CloseIcon />
          </button>
        </div>
      </header>
      <div ref={body} className="scroll-area flex-1 overflow-y-auto px-5 pt-4 pb-6">{children}</div>
      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-sm">
        <button className="btn btn-ghost !px-3" onClick={() => openSection(prev.id)} aria-label={`Previous: ${prev.title}`}>
          <ArrowLeft size={16} /> <span className="hidden sm:inline">{prev.title}</span>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: Math.min(delay, 0.1) + i * 0.02, duration: 0.25 }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.1), ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
