import type { Config } from 'tailwindcss'

const config: Config = {
  // Enable dark mode via the 'dark' class on <html>
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Deep Teal + Frost Lavender palette ──────────────────
        // primary scale maps to the lavender accent (#C6B8F0 at 400/500)
        // dark tones anchor to the deep teal base (#0A1F22)
        primary: {
          50:  '#f3f0fb',   // frost lavender — light bg / text-on-dark   (#F3F0FB)
          100: '#e8e2f7',
          200: '#d9cfff',
          300: '#c6b8f0',   // lavender accent                             (#C6B8F0)
          400: '#b8a6e8',
          500: '#c6b8f0',   // primary accent — buttons, links, highlights (#C6B8F0)
          600: '#276b6e',   // mid teal — secondary buttons, borders, icons (#276B6E)
          700: '#1a5255',
          800: '#123b3e',   // secondary dark surface — cards, sections    (#123B3E)
          900: '#0a1f22',   // deep teal base — navbar, hero, footer       (#0A1F22)
          950: '#061518',
        },
        // secondary scale — teal surface tones for backgrounds & cards
        secondary: {
          50:  '#f3f0fb',   // frost lavender
          100: '#e0f4f4',
          200: '#b8e4e5',
          300: '#7ecdd0',
          400: '#45b3b8',
          500: '#276b6e',   // mid teal accent                             (#276B6E)
          600: '#1d5255',
          700: '#143b3e',
          800: '#123b3e',   // dark surface                                (#123B3E)
          900: '#0a1f22',   // deep teal base                              (#0A1F22)
          950: '#061518',
        },
        // Semantic tokens — kept readable against both bg tones
        success:  '#10b981', // emerald-500
        warning:  '#f59e0b', // amber-500
        error:    '#ef4444', // red-500
        info:     '#7ecdd0', // teal-ish info tone
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
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
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
