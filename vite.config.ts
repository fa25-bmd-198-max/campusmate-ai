import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Array-based manual chunks avoid circular dependency warnings.
        // Each entry lists the exact package names Rollup should group together.
        manualChunks: {
          // ── Core React ──────────────────────────────────────
          react:    ['react', 'react-dom'],
          // ── Routing ─────────────────────────────────────────
          router:   ['react-router-dom'],
          // ── Server state ─────────────────────────────────────
          query:    ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          // ── Data / backend ───────────────────────────────────
          supabase: ['@supabase/supabase-js'],
          // ── AI SDK ───────────────────────────────────────────
          gemini:   ['@google/generative-ai'],
          // ── Validation ───────────────────────────────────────
          zod:      ['zod'],
          // ── Forms ────────────────────────────────────────────
          forms:    ['react-hook-form', '@hookform/resolvers'],
          // ── Charts ───────────────────────────────────────────
          charts:   ['recharts'],
          // ── Calendar ─────────────────────────────────────────
          calendar: [
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/list',
            '@fullcalendar/interaction',
          ],
          // ── Animations ───────────────────────────────────────
          motion:   ['framer-motion'],
          // ── File parsing ─────────────────────────────────────
          pdf:      ['pdfjs-dist'],
          mammoth:  ['mammoth'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
