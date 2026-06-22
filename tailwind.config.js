/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#0a0a14',
          surface: '#12121f',
          card: '#1a1a2e',
          border: '#2a2a50',
          accent: '#e63946',
          gold: '#f4b942',
        },
        rarity: {
          common: '#9ca3af',
          uncommon: '#4ade80',
          rare: '#60a5fa',
          holo: '#c084fc',
          ultra: '#fb923c',
          secret: '#fde047',
        },
      },
      fontFamily: {
        game: ['"Press Start 2P"', 'monospace'],
      },
      animation: {
        'flip-in': 'flipIn 0.4s ease-out',
        'card-reveal': 'cardReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'hp-drain': 'hpDrain 0.8s ease-out',
        'shake': 'shake 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        flipIn: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        cardReveal: {
          '0%': { transform: 'scale(0.5) rotateY(180deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        hpDrain: {
          '0%': { width: 'var(--from-width)' },
          '100%': { width: 'var(--to-width)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
