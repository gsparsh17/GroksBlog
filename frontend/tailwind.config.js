/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f7f8', 100: '#eeeef0', 200: '#d9d9de', 300: '#b8b8c0',
          400: '#92929e', 500: '#747483', 600: '#5e5e6b', 700: '#4d4d58',
          800: '#42424b', 900: '#3a3a41', 950: '#111118',
        },
        ember: { 400: '#fb8c3d', 500: '#f97316', 600: '#ea6c0e' },
        azure: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
        crimson: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'ticker': 'ticker 25s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ticker: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      boxShadow: {
        'glow': '0 0 30px rgba(249, 115, 22, 0.3)',
        'glow-blue': '0 0 30px rgba(14, 165, 233, 0.3)',
        'editorial': '0 4px 6px -1px rgba(0,0,0,0.1), 0 20px 40px -10px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
