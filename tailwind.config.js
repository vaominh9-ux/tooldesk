/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f6f7fb',
        surface: '#ffffff',
        ink: '#202a43',
        muted: '#778197',
        line: '#e8ebf2',
        accent: {
          DEFAULT: '#5963e8',
          dark: '#4651d6',
          soft: '#eff0ff',
        },
        tooldesk: {
          green: '#15775c',
          amber: '#9d6817',
          red: '#b14949',
        }
      },
      borderRadius: {
        tooldesk: '14px',
      },
      width: {
        sidebar: '224px',
      }
    },
  },
  plugins: [],
};
