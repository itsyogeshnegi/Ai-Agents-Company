/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          bg: "#f4ede2",
          panel: "#fffdf9",
          border: "#4a3b32",
          dark: "#1e1b18",
          wood: "#8c6239",
          desk: "#d7ba8d",
          carpet: "#c5d3c1",
          terminal: "#181824",
          accent: "#ff5e36"
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
