/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        mist: '#eff6ff',
        coral: '#ff6b57',
        teal: '#0f766e',
        sand: '#fff7ed',
        slateblue: '#1d4ed8',
      },
      fontFamily: {
        sans: ['"Sora"', '"Segoe UI"', 'sans-serif'],
        display: ['"Clash Display"', '"Sora"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.10)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};