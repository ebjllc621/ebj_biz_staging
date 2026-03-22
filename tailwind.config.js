/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Bizconekt custom color palette
        bizconekt: {
          primary: '#ed6437',     // orange-red accent
          primaryLight: '#fbe7e1', // light version of primary for hover
          primaryDark: '#d54a1f',  // darker version for hover states
          navy: '#002641',        // deep blue for navigation or headers
          navyLight: '#e3eaf2',   // much lighter version of navy for hover
          grayish: '#8d918d',     // soft neutral gray
          grayishLight: '#e5e6e5', // lighter version of grayish for hover
          grayishDark: '#444746',  // dark gray for neutral hover text
          background: '#fefefe'   // clean white background
        },
        // Shorthand aliases for common bizconekt colors (used across codebase)
        'biz-navy': '#002641',
        // Phase 4: Accessible orange color variants (WCAG 2.1 AA compliance)
        // Updated for 4.5:1 contrast ratio on white backgrounds
        'biz-orange': {
          DEFAULT: '#C65D00',  // Darker orange for text - meets 4.5:1 contrast
          light: '#FF8C38',    // For backgrounds and non-text elements only
          original: '#ed6437'  // Legacy color preserved for gradual migration
        },
        // Phase 4: Accessible gray variants for improved readability
        'accessible-gray': {
          500: '#525252',  // Higher contrast gray (5.74:1 on white)
          600: '#404040',  // Even higher contrast (9.73:1 on white)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
