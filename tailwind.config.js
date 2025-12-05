/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aladin Foods Colors (Primary Brand)
        aladin: {
          green: '#195E33',
          'green-light': '#238442',
          'green-dark': '#124425',
          cream: '#F8FBF9',
        },
        // Pepsi Colors (Secondary Brand)
        pepsi: {
          blue: '#004B93',
          'blue-light': '#0066CC',
          'blue-dark': '#003366',
          red: '#E32934',
        },
        // App Theme - Aladin as primary
        primary: '#195E33',
        'primary-light': '#238442',
        'primary-dark': '#124425',
        secondary: '#004B93',
        'secondary-light': '#0066CC',
        accent: '#E32934',
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(25, 94, 51, 0.1)',
        'card-hover': '0 8px 30px rgba(25, 94, 51, 0.18)',
        'button': '0 4px 14px rgba(25, 94, 51, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
