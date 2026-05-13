/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        construction: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
        navy: {
          800: '#1a2744', 900: '#0f1c33', 950: '#070e1f',
        },
        neon: {
          cyan: '#00d4ff',
          violet: '#8c3aff',
          pink: '#ff006e',
          green: '#00d68f',
          amber: '#ffb800',
        },
        dark: {
          base: '#0a0e1f',
          card: '#0d1428',
          surface: '#111c3a',
          elevated: '#162040',
          border: '#1e2d50',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset',
        'card-lg': '0 8px 40px rgba(0,0,0,0.6)',
        'glow-cyan': '0 0 20px rgba(0,212,255,0.35), 0 0 60px rgba(0,212,255,0.12)',
        'glow-violet': '0 0 20px rgba(140,58,255,0.35), 0 0 60px rgba(140,58,255,0.12)',
        'glow-pink': '0 0 20px rgba(255,0,110,0.35), 0 0 60px rgba(255,0,110,0.12)',
        'glow-green': '0 0 20px rgba(0,214,143,0.35)',
        'neon': '0 0 0 1px rgba(0,212,255,0.3), 0 0 20px rgba(0,212,255,0.15)',
      },
    },
  },
  plugins: [],
};
