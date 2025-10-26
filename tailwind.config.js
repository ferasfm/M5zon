/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        'primary': '#2563eb', // blue-600
        'primary-hover': '#1d4ed8', // blue-700
        'secondary': '#e2e8f0', // slate-200
        'secondary-hover': '#cbd5e1', // slate-300
        'danger': '#dc2626', // red-600
        'danger-hover': '#b91c1c', // red-700
        'warning': '#f59e0b', // amber-500
        'success': '#16a34a', // green-600
        'light': '#f1f5f9', // slate-100
        'dark': '#1e293b', // slate-800
      },
    },
  },
  plugins: [],
}
