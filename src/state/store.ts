import { create } from 'zustand'
import type { SectionId } from '../lib/sections'

export type Phase = 'loading' | 'intro' | 'entering' | 'world'
export type Quality = 'high' | 'low'

type Toast = { id: number; title: string; body?: string; tone?: 'lime' | 'gold' }

type State = {
  phase: Phase
  quickView: boolean
  webglFailed: boolean
  section: SectionId | null
  /** Sub-selection inside the active section (index into the matching data array). */
  item: Record<SectionId, number | null>
  hovered: SectionId | null
  night: boolean
  reducedMotion: boolean
  quality: Quality
  coachOpen: boolean
  menuOpen: boolean
  /** Phone bottom sheet shrunk to its header so the field is visible. */
  sheetCollapsed: boolean
  interacted: boolean
  toast: Toast | null
  conversions: number
  /** Monotonic counters used to fire one-shot scene events. */
  kickNonce: number
  waveNonce: number

  setPhase: (p: Phase) => void
  openSection: (s: SectionId, item?: number | null) => void
  selectItem: (s: SectionId, item: number | null) => void
  closeSection: () => void
  setHovered: (s: SectionId | null) => void
  toggleNight: () => void
  setReducedMotion: (v: boolean) => void
  setQuality: (q: Quality) => void
  setQuickView: (v: boolean) => void
  setWebglFailed: () => void
  setCoachOpen: (v: boolean) => void
  setMenuOpen: (v: boolean) => void
  setSheetCollapsed: (v: boolean) => void
  markInteracted: () => void
  showToast: (t: Omit<Toast, 'id'>) => void
  clearToast: () => void
  kick: () => void
  scoreConversion: () => void
}

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const lowEnd =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches ||
    Math.min(window.innerWidth, window.innerHeight) < 600 ||
    (navigator.hardwareConcurrency ?? 8) <= 4)

const emptyItems: Record<SectionId, number | null> = {
  about: null,
  projects: null,
  experience: null,
  leadership: null,
  skills: null,
  contact: null,
}

export const useStore = create<State>((set, get) => ({
  phase: 'loading',
  quickView: false,
  webglFailed: false,
  section: null,
  item: { ...emptyItems },
  hovered: null,
  night: true,
  reducedMotion: !!prefersReduced,
  quality: lowEnd ? 'low' : 'high',
  coachOpen: false,
  menuOpen: false,
  sheetCollapsed: false,
  interacted: false,
  toast: null,
  conversions: 0,
  kickNonce: 0,
  waveNonce: 0,

  setPhase: (phase) => set({ phase }),
  openSection: (section, item = null) =>
    set((s) => ({
      section,
      sheetCollapsed: false,
      item: { ...s.item, [section]: item },
      menuOpen: false,
      interacted: true,
      phase: s.phase === 'world' ? s.phase : 'world',
    })),
  selectItem: (section, item) => set((s) => ({ item: { ...s.item, [section]: item } })),
  closeSection: () => set({ section: null, item: { ...emptyItems }, sheetCollapsed: false }),
  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered })
  },
  toggleNight: () => set((s) => ({ night: !s.night })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setQuality: (quality) => set({ quality }),
  setQuickView: (quickView) => set({ quickView, menuOpen: false }),
  setWebglFailed: () => set({ webglFailed: true, quickView: true }),
  setCoachOpen: (coachOpen) => set({ coachOpen, menuOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setSheetCollapsed: (sheetCollapsed) => set({ sheetCollapsed }),
  markInteracted: () => {
    if (!get().interacted) set({ interacted: true })
  },
  showToast: (t) => set({ toast: { ...t, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
  kick: () => set((s) => ({ kickNonce: s.kickNonce + 1 })),
  scoreConversion: () => set((s) => ({ conversions: s.conversions + 1, waveNonce: s.waveNonce + 1 })),
}))
