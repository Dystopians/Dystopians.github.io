/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#05070d',
          dark: '#0b1020',
          green: '#39ff14',
          pink: '#ff00ff',
          cyan: '#00f3ff',
          yellow: '#fdfd00',
          gray: '#253042'
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        sans: ['"Trebuchet MS"', '"Segoe UI"', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
