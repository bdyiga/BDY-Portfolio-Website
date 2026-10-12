import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const REACT = /\/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\//
const THREE = /\/node_modules\/(three|@react-three|postprocessing|three-stdlib|camera-controls|maath|meshline|stats-gl|troika[^/]*|@monogrid|n8ao)\//
const GSAP = /\/node_modules\/gsap\//

// Relative base works for both GitHub Pages (/BDY-Portfolio-Website/) and Netlify (/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Keep the 3D stack out of the first paint: it is only reached through a dynamic import.
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (REACT.test(p)) return 'react-vendor'
          if (THREE.test(p)) return 'three-vendor'
          if (GSAP.test(p)) return 'gsap'
        },
      },
    },
  },
})
