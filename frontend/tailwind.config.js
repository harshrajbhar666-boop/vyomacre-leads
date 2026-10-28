/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vyomPrimary: '#0369a1',
        vyomSecondary: '#10b981',
        vyomAccent: '#f59e0b',
        vyomBase: '#f1f5f9',
      },
    },
  },
  plugins: [],
}
