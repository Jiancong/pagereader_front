/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1419',
        foreground: '#e7e9ea',
        card: '#16202a',
        'card-foreground': '#e7e9ea',
        primary: '#1d9bf0',
        'primary-foreground': '#ffffff',
        secondary: '#2f3336',
        'secondary-foreground': '#e7e9ea',
        muted: '#2f3336',
        'muted-foreground': '#71767b',
        accent: '#1d9bf0',
        'accent-foreground': '#ffffff',
        border: '#2f3336',
        input: '#2f3336',
        ring: '#1d9bf0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
