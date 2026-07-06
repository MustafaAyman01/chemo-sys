/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        en: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ChemCo Brand
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c0d0ff',
          300: '#94b0fd',
          400: '#6388f9',
          500: '#3d62f3',
          600: '#2641e8',
          700: '#1e31d5',
          800: '#1e2bac',
          900: '#1e2a88',
          950: '#161b57',
        },
        // Chemical accent - teal
        accent: {
          50:  '#edfcf9',
          100: '#d2f7f1',
          200: '#a9ede4',
          300: '#72ddd3',
          400: '#3dc6bc',
          500: '#21aaa3',
          600: '#178985',
          700: '#156e6c',
          800: '#145758',
          900: '#134849',
          950: '#042c2e',
        },
        // Status colors
        success: { 50: '#f0fdf4', 500: '#22c55e', 700: '#15803d' },
        warning: { 50: '#fffbeb', 500: '#f59e0b', 700: '#b45309' },
        danger:  { 50: '#fef2f2', 500: '#ef4444', 700: '#b91c1c' },
        info:    { 50: '#eff6ff', 500: '#3b82f6', 700: '#1d4ed8' },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
        dropdown: '0 8px 24px rgb(0 0 0 / 0.12)',
        modal: '0 20px 60px rgb(0 0 0 / 0.18)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4' }],
        xs:    ['11px', { lineHeight: '1.5' }],
        sm:    ['13px', { lineHeight: '1.5' }],
        base:  ['14px', { lineHeight: '1.6' }],
        md:    ['15px', { lineHeight: '1.6' }],
        lg:    ['16px', { lineHeight: '1.5' }],
        xl:    ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.3' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
        '4xl': ['30px', { lineHeight: '1.1' }],
      },
      spacing: {
        sidebar: '260px',
        header:  '56px',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-in':   'slideIn 0.2s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
