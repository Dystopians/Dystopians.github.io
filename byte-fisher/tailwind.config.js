/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#050505',
          dark: '#0a0f0d',
          green: '#39ff14',
          pink: '#ff00ff',
          cyan: '#00f3ff',
          yellow: '#fdfd00',
          gray: '#2a2a2a'
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace']
      }
    }
  },
  plugins: []
};
