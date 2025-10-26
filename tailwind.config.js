/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1f2937',
          hover: '#111827',
        },
        secondary: {
          DEFAULT: '#f3f4f6',
          hover: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
}
