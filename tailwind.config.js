/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#080C14',
        night: '#0F1520',
        abyss: '#141E2E',
        deep: '#1A2338',
        navy: '#1E3054',
        royal: '#3040C4',
        dragon: '#6BB8EC',
        crimson: '#CC1515',
        flame: '#FF2222',
        frost: '#C8D8F0',
        ash: '#8A90A8',
      },
      fontFamily: {
        agency: ['"Agency Bold"', 'Impact', 'sans-serif'],
        exo: ['"Exo 2"', 'sans-serif'],
      },
      backgroundImage: {
        'hex-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236BB8EC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236BB8EC' fill-opacity='0.03'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'card-shimmer': 'cardShimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'stagger-in': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(107,184,236,0.3), 0 0 20px rgba(107,184,236,0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(107,184,236,0.6), 0 0 40px rgba(107,184,236,0.3)' },
        },
        cardShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'dragon': '0 0 20px rgba(107,184,236,0.4)',
        'crimson': '0 0 20px rgba(204,21,21,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.6)',
        'card-hover': '0 8px 40px rgba(107,184,236,0.2), 0 4px 24px rgba(0,0,0,0.8)',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}
