/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        brand: {
          navy: '#25306B',
          blue: '#006BB9',
          red: '#FF1D3D',
          mist: '#EDF0F5',
          indigo: '#2C3D9E',
        },
      },
      fontFamily: {
        sans: ['"Sora"', '"Segoe UI"', 'sans-serif'],
        display: ['"Clash Display"', '"Sora"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 24px 70px rgba(37, 48, 107, 0.12)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(37, 48, 107, 0.10) 1px, transparent 0)',
        'brand-hero': 'linear-gradient(135deg, rgba(37, 48, 107, 0.96) 0%, rgba(44, 61, 158, 0.92) 40%, rgba(0, 107, 185, 0.88) 100%)',
        'brand-alert': 'linear-gradient(135deg, rgba(255, 29, 61, 0.96) 0%, rgba(237, 240, 245, 0.92) 100%)',
      },
    },
  },
  plugins: [],
};