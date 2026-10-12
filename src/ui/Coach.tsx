import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { COACH_SUGGESTIONS, coachReply, type CoachAction } from '../lib/coach'
import { useStore } from '../state/store'
import { CloseIcon, SendIcon, WhistleIcon } from './icons'

type Msg = { id: number; from: 'coach' | 'you'; text: string; actions?: CoachAction[] }

const WELCOME: Msg = {
  id: 0,
  from: 'coach',
  text: "I'm the Coach, Benedict's portfolio assistant. Ask about his experience, projects, skills, education, or leadership. I only answer from his portfolio, so I won't make anything up.",
}

export function Coach() {
  const open = useStore((s) => s.coachOpen)
  const setOpen = useStore((s) => s.setCoachOpen)
  const openSection = useStore((s) => s.openSection)
  const setQuickView = useStore((s) => s.setQuickView)
  const quickView = useStore((s) => s.quickView)
  const webglFailed = useStore((s) => s.webglFailed)
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  const ask = (q: string) => {
    const text = q.trim()
    if (!text || typing) return
    setMsgs((m) => [...m, { id: Date.now(), from: 'you', text }])
    setInput('')
    setTyping(true)
    window.setTimeout(() => {
      const r = coachReply(text)
      setMsgs((m) => [...m, { id: Date.now() + 1, from: 'coach', text: r.text, actions: r.actions }])
      setTyping(false)
    }, 380 + Math.random() * 380)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  const runAction = (a: CoachAction) => {
    if (webglFailed) {
      document.getElementById(`qv-${a.section}`)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (quickView) setQuickView(false)
    openSection(a.section, a.item ?? null)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-label="Ask the Coach: portfolio assistant"
          className="glass-strong fixed inset-x-2 bottom-2 z-50 flex h-[min(560px,80dvh)] flex-col overflow-hidden rounded-3xl shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:w-[400px]"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))}
        >
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-charcoal">
              <WhistleIcon />
            </span>
            <div className="flex-1">
              <p className="display text-base">The Coach</p>
              <p className="text-[0.7rem] text-silver-dim">Portfolio assistant · answers only from Benedict's portfolio</p>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close the Coach">
              <CloseIcon />
            </button>
          </header>

          <div ref={list} className="scroll-area flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.from === 'you' ? 'rounded-br-md bg-lime text-charcoal' : 'rounded-bl-md border border-white/10 bg-white/[0.04] text-silver'
                  }`}
                >
                  {m.text}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <button key={a.label} onClick={() => runAction(a)} className="rounded-full border border-lime/40 px-2.5 py-1 text-xs text-lime hover:bg-lime/10">
                          {a.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-1 px-2" aria-label="The Coach is typing">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-lime/70"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }}
                  />
                ))}
              </div>
            )}
          </div>

          {msgs.length <= 2 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 scroll-area">
              {COACH_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-silver hover:border-lime/50 hover:text-lime">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
            <label htmlFor="coach-input" className="sr-only">
              Ask the Coach a question
            </label>
            <input
              id="coach-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about experience, projects, skills…"
              className="flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-ink placeholder:text-silver-dim focus:border-lime/60 focus:outline-none"
              autoComplete="off"
            />
            <button type="submit" className="icon-btn !bg-lime !text-charcoal" aria-label="Send question" disabled={!input.trim()}>
              <SendIcon size={16} />
            </button>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
