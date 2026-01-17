/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#2563eb',
        plastic: '#16a34a',
        food: '#92400e',
        mixed: '#6b7280',
        recycling: '#7c3aed',
      }
    },
  },
  plugins: [],
}
