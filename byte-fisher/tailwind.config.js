/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#08171e',
          dark: '#10252c',
          green: '#9bdbb5',
          pink: '#eb988a',
          cyan: '#89dcd0',
          yellow: '#eac78e',
          gray: '#354b51'
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
