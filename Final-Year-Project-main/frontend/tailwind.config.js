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
        midnight: '#0A0F1C',
        surface: {
          DEFAULT: '#0F172A',
          card: '#0F172A',
          elevated: '#131D31',
          border: '#1E293B',
          hover: '#1E293B'
        },
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#22D3EE', // Cyan accent
          500: '#14B8A6', // Primary Teal
          600: '#0D9488', // Deep Teal
          700: '#0F766E',
          800: '#0F172A', // Card surface
          900: '#0A0F1C', // Dark background
          accent: '#22D3EE',
          mint: '#14B8A6',
          amber: '#F59E0B',
          crimson: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
