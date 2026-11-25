/** @type {import('tailwindcss').Config} */
// Colour scales follow the BuildTrack Pro design tokens (client/src/index.css).
// `primary` and `construction` are the gold scale; `navy`/`dark` are the architectural blacks.
const gold = {
  50: '#FBF6EA', 100: '#F5EACB', 200: '#EBD59A', 300: '#E0BC63',
  400: '#D4A845', 500: '#C9982C', 600: '#A67C22', 700: '#7A5A12',
  800: '#5E450D', 900: '#3F2E08', 950: '#241A04',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: gold,
        construction: gold,
        gold: { DEFAULT: '#C9982C', light: '#E0BC63', dark: '#7A5A12' },
        ink: '#050505',
        'warm-white': '#F5F1E8',
        navy: { 800: '#17171A', 900: '#0A0A0B', 950: '#050505' },
        neon: {
          cyan: '#C9982C',
          violet: '#A894D6',
          pink: '#E5636A',
          green: '#5BBF8A',
          amber: '#E6B04A',
        },
        dark: {
          base: '#050505',
          card: '#0A0A0B',
          surface: '#101012',
          elevated: '#17171A',
          border: '#26262B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: 'var(--shadow-md)',
        'card-lg': 'var(--shadow-lg)',
        'glow-cyan': '0 0 0 1px rgba(201,152,44,0.35)',
        'glow-violet': '0 0 0 1px rgba(201,152,44,0.35)',
        'glow-pink': '0 0 0 1px rgba(229,99,106,0.35)',
        'glow-green': '0 0 0 1px rgba(91,191,138,0.35)',
        neon: '0 0 0 1px rgba(201,152,44,0.35)',
      },
    },
  },
  plugins: [],
};
