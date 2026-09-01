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
        finai: {
          dark: {
            bg: '#0B0E14',
            surface: '#12151C',
            elevated: '#181C25',
            border: '#232732',
            brand: '#1B2A4A',
            accent: '#5B5FEF',
            accentHover: '#7477F5',
            emerald: '#22C55E',
            amber: '#F59E0B',
            crimson: '#EF4444',
            cyan: '#38BDF8',
            text: '#F5F6FA',
            secondary: '#A6ADBB',
            muted: '#6B7280',
          },
          light: {
            bg: '#FAFBFC',
            surface: '#FFFFFF',
            elevated: '#F1F5F9',
            border: '#E2E8F0',
            brand: '#1B2A4A',
            accent: '#4F46E5',
            accentHover: '#4338CA',
            emerald: '#16A34A',
            amber: '#D97706',
            crimson: '#DC2626',
            cyan: '#0284C7',
            text: '#0F172A',
            secondary: '#475569',
            muted: '#94A3B8',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
      borderRadius: {
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
