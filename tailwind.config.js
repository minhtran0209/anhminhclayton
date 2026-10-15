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
        court: {
          bg: '#0f172a', // Slate 900 tactical surface
          board: '#1e293b', // Court playing area
          paint: '#172554', // Dark blue paint tint
          lines: '#94a3b8', // Crisp slate lines
          border: '#334155',
        },
        offense: {
          DEFAULT: '#38bdf8', // Sky 400
          dark: '#0284c7', // Sky 600
          light: '#e0f2fe',
          ring: '#0ea5e9',
        },
        defense: {
          DEFAULT: '#f87171', // Red 400
          dark: '#dc2626', // Red 600
          light: '#fee2e2',
          ring: '#ef4444',
        },
        ball: {
          DEFAULT: '#fb923c', // Orange 400
          glow: '#ea580c',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
