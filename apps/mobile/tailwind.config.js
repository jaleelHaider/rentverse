/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#3b82f6',
        'primary-dark': '#1d4ed8',
        'slate-gray': '#64748b',
        'dark-slate': '#334155',
        'light-gray': '#f1f5f9',
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
};
