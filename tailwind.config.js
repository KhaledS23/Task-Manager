/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        prio: '#8B0000', // dark red for prio future tasks
        nonPrio: '#1E90FF', // blue for non prio future tasks
        past: '#A0AEC0' // grey for past tasks
      }
    },
  },
  plugins: [],
};
