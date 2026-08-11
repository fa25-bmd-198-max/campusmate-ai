import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Charcoal + Burgundy + Forest palette ─────────────────
        // #36454F — charcoal blue-grey  → surfaces, sidebar, navbar
        // #3C0000 — deep burgundy       → primary accent, CTAs, active states
        // #1C3A2A — forest green        → secondary accent, success tones
        // #F5F0EB — warm off-white      → light page background
        // #EDE8E0 — warm card surface   → card bg on light mode
        primary: {
          50:  '#fdf5f5',
          100: '#f9e4e4',
          200: '#f0bcbc',
          300: '#e48888',
          400: '#cc4444',
          500: '#3c0000',   // deep burgundy — primary accent          (#3C0000)
          600: '#3c0000',   // same — used for buttons/links
          700: '#2d0000',
          800: '#1e0000',
          900: '#0f0000',
          950: '#070000',
        },
        // Surface / layout scale — charcoal blue-grey
        surface: {
          50:  '#f5f6f7',
          100: '#e8eaec',
          200: '#cdd2d6',
          300: '#a8b0b7',
          400: '#7d8c96',
          500: '#36454f',   // charcoal blue-grey — sidebar/navbar     (#36454F)
          600: '#2d3a43',
          700: '#232e36',
          800: '#1a2229',
          900: '#10161b',
          950: '#080c0f',
        },
        // Forest green — secondary accent
        forest: {
          50:  '#f0f7f3',
          100: '#d9ede2',
          200: '#a8d4bb',
          300: '#6db593',
          400: '#3a8f67',
          500: '#1c3a2a',   // forest green — secondary accent          (#1C3A2A)
          600: '#163020',
          700: '#102417',
          800: '#0a180f',
          900: '#050c07',
          950: '#020504',
        },
        // Semantic tokens
        success:  '#1c3a2a',
        warning:  '#b45309',
        error:    '#991b1b',
        info:     '#36454f',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '2.5rem',  fontWeight: '600' }],
        h1:      ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        h2:      ['1.375rem',{ lineHeight: '1.875rem',fontWeight: '600' }],
        h3:      ['1.125rem',{ lineHeight: '1.75rem', fontWeight: '500' }],
        body:    ['0.875rem',{ lineHeight: '1.5rem',  fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg:      '0.75rem',
        xl:      '1rem',
        '2xl':   '1.25rem',
      },
      boxShadow: {
        card:  '0 1px 4px 0 rgb(54 69 79 / 0.10), 0 1px 2px -1px rgb(54 69 79 / 0.08)',
        modal: '0 20px 40px -8px rgb(54 69 79 / 0.25), 0 8px 16px -4px rgb(54 69 79 / 0.12)',
      },
      animation: {
        'fade-in':        'fadeIn 0.2s ease-in-out',
        'slide-up':       'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
