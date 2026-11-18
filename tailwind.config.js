/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6fa',
          100: '#e2edf4',
          200: '#c5dce9',
          300: '#99c2db',
          400: '#5d9bc1',
          500: '#2d74a3',
          600: '#1e5880',
          700: '#1a4c6e',
          800: '#153d58',
          900: '#102f44',
          950: '#0a1d2b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
}

