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
        dark: {
          900: '#0a0a0a',
          800: '#141414',
          700: '#1f1f1f',
          glass: 'rgba(20, 20, 20, 0.75)'
        },
        primary: {
          green: '#10b981', // Safest route / highlights
          blue: '#3b82f6',  // Fastest route
          red: '#ef4444',   // Rejected route
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      }
    },
  },
  plugins: [],
}
