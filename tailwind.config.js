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
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.96) translateY(12px)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-out': 'fadeOut 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-in': 'modalIn 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-out': 'modalOut 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
      },
    },
  },
  plugins: [],
}
