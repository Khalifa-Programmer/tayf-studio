/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Arabic', 'Cairo', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
