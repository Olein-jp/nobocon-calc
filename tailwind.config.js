/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#f1f5f9',
        tide: '#0ea5a4',
        coral: '#fb7185',
        sun: '#f59e0b'
      },
      boxShadow: {
        glow: '0 10px 25px rgba(14, 165, 164, 0.2)'
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        floatIn: 'floatIn 0.5s ease-out both'
      }
    }
  },
  plugins: []
};
