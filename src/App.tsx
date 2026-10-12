import { Component, lazy, Suspense, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { experiences, leadership, projects, skillGroups } from './data/portfolio'
import { SECTIONS, type SectionId } from './lib/sections'
import { useStore } from './state/store'
import { Coach } from './ui/Coach'
import { HUD, Toast } from './ui/HUD'
import { Intro, Loader } from './ui/Intro'
import { QuickView } from './ui/QuickView'
import { AboutPanel } from './ui/panels/AboutPanel'
import { ContactPanel } from './ui/panels/ContactPanel'
import { ExperiencePanel } from './ui/panels/ExperiencePanel'
import { LeadershipPanel } from './ui/panels/LeadershipPanel'
import { ProjectsPanel } from './ui/panels/ProjectsPanel'
import { SkillsPanel } from './ui/panels/SkillsPanel'

// The whole 3D stack (three.js, R3F, drei, postprocessing) is code-split and loaded lazily.
const Experience = lazy(() => import('./three/Experience'))

const ITEM_IDS: Partial<Record<SectionId, string[]>> = {
  projects: projects.map((p) => p.id),
  experience: experiences.map((e) => e.id),
  leadership: leadership.map((l) => l.id),
  skills: skillGroups.map((g) => g.id),
}

function parseHash(hash: string): { quick: boolean; section: SectionId | null; item: number | null } {
  const [s, i] = hash.replace(/^#\/?/, '').split('/')
  if (s === 'quick') return { quick: true, section: null, item: null }
  const section = SECTIONS.find((x) => x.id === s)?.id ?? null
  const idx = section && i ? (ITEM_IDS[section]?.indexOf(i) ?? -1) : -1
  return { quick: false, section, item: idx >= 0 ? idx : null }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl')
  } catch {
    return false
  }
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('3D stadium failed, falling back to Quick View:', err)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Panels() {
  const section = useStore((s) => s.section)
  return (
    <AnimatePresence mode="wait">
      {section === 'about' && <AboutPanel key="about" />}
      {section === 'projects' && <ProjectsPanel key="projects" />}
      {section === 'experience' && <ExperiencePanel key="experience" />}
      {section === 'leadership' && <LeadershipPanel key="leadership" />}
      {section === 'skills' && <SkillsPanel key="skills" />}
      {section === 'contact' && <ContactPanel key="contact" />}
    </AnimatePresence>
  )
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      const st = useStore.getState()
      if (e.key === 'Escape') {
        if (st.menuOpen) return st.setMenuOpen(false)
        if (st.coachOpen) return st.setCoachOpen(false)
        if (st.section) return st.closeSection()
        return
      }
      if (st.quickView) {
        if (e.key.toLowerCase() === 'q' && !st.webglFailed) st.setQuickView(false)
        return
      }
      if (st.phase === 'loading') return
      if (st.phase === 'intro') {
        if (e.key === 'Enter' && el.tagName !== 'BUTTON') st.setPhase('entering')
        if (e.key.toLowerCase() === 'q') st.setQuickView(true)
        return
      }
      if (st.phase !== 'world') return
      const k = e.key.toLowerCase()
      const sec = SECTIONS.find((s) => s.key === e.key)
      if (sec) return st.openSection(sec.id)
      if (k === '0') return st.closeSection()
      if (k === 'n') return st.toggleNight()
      if (k === 'q') return st.setQuickView(true)
      if (k === 'c') return st.setCoachOpen(true)
      if (k === 'm') return st.setMenuOpen(true)
      if (k === 'k') return st.kick()
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && st.section && ITEM_IDS[st.section]) {
        const n = ITEM_IDS[st.section]!.length
        const cur = st.item[st.section]
        const dir = e.key === 'ArrowRight' ? 1 : -1
        const next = cur === null ? (dir > 0 ? 0 : n - 1) : (cur + dir + n) % n
        st.selectItem(st.section, next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function useHashSync() {
  const section = useStore((s) => s.section)
  const item = useStore((s) => (s.section ? s.item[s.section] : null))
  const quickView = useStore((s) => s.quickView)
  const phase = useStore((s) => s.phase)

  // state -> URL (replaceState: no history spam)
  useEffect(() => {
    if (phase === 'loading' && !quickView) return
    let hash = ''
    if (quickView) hash = '#quick'
    else if (section) {
      const id = item !== null ? ITEM_IDS[section]?.[item] : undefined
      hash = `#${section}${id ? `/${id}` : ''}`
    }
    if (hash !== window.location.hash) history.replaceState(null, '', hash || window.location.pathname + window.location.search)
  }, [section, item, quickView, phase])

  // URL -> state (manual edits / back-forward)
  useEffect(() => {
    const onHash = () => {
      const r = parseHash(window.location.hash)
      const st = useStore.getState()
      if (r.quick) return st.setQuickView(true)
      if (r.section) {
        st.setQuickView(false)
        if (st.phase !== 'world') st.setPhase('world')
        st.openSection(r.section, r.item)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
}

export default function App() {
  const phase = useStore((s) => s.phase)
  const quickView = useStore((s) => s.quickView)
  const webglFailed = useStore((s) => s.webglFailed)
  const reduced = useStore((s) => s.reducedMotion)
  const night = useStore((s) => s.night)
  const initial = useRef(parseHash(window.location.hash))

  useKeyboard()
  useHashSync()

  useEffect(() => {
    if (!hasWebGL()) useStore.getState().setWebglFailed()
    else if (initial.current.quick) useStore.getState().setQuickView(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => useStore.getState().setReducedMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.night = String(night)
  }, [night])

  const onReady = useCallback(() => {
    const st = useStore.getState()
    if (st.phase !== 'loading') return
    const r = initial.current
    if (r.section) {
      st.setPhase('world')
      st.openSection(r.section, r.item)
    } else st.setPhase('intro')
  }, [])

  const onSceneError = useCallback(() => useStore.getState().setWebglFailed(), [])

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <a
        href="#quick"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-charcoal"
        onClick={(e) => {
          e.preventDefault()
          useStore.getState().setQuickView(true)
        }}
      >
        Skip to the text-only Quick View
      </a>

      {!webglFailed && (
        <SceneBoundary onError={onSceneError}>
          <Suspense fallback={null}>
            <div aria-hidden className={quickView ? 'invisible' : ''}>
              <Experience onReady={onReady} paused={quickView} />
            </div>
          </Suspense>
        </SceneBoundary>
      )}

      {!webglFailed && !quickView && (
        <>
          <AnimatePresence>{phase === 'loading' && <Loader key="loader" />}</AnimatePresence>
          <AnimatePresence>{(phase === 'intro' || phase === 'entering') && <Intro key="intro" />}</AnimatePresence>
          {phase === 'world' && (
            <>
              <HUD />
              <Panels />
            </>
          )}
        </>
      )}

      <AnimatePresence>{quickView && <QuickView key="quick" />}</AnimatePresence>
      <Coach />
      <Toast />
    </MotionConfig>
  )
}
