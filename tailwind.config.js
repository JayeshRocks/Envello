/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        financial: {
          surplus: {
            DEFAULT: '#10b981', // emerald-500
            light: '#d1fae5',   // emerald-100
            dark: '#047857',    // emerald-700
          },
          liability: {
            DEFAULT: '#ef4444', // red-500
            light: '#fee2e2',   // red-100
            dark: '#b91c1c',    // red-700
          },
          transfer: {
            DEFAULT: '#6366f1', // indigo-500
            light: '#e0e7ff',   // indigo-100
            dark: '#4338ca',    // indigo-700
          },
          savings: {
            DEFAULT: '#f59e0b', // amber-500
            light: '#fef3c7',   // amber-100
            dark: '#b45309',    // amber-700
          },
          envelope: {
            DEFAULT: '#0ea5e9', // sky-500
            light: '#e0f2fe',   // sky-100
            dark: '#0369a1',    // sky-700
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
