/**
 * TailwindCSS Configuration
 * 
 * Custom configuration for HealthHub v2 design system.
 * Primary color: #0066CC (blue)
 * Dark sidebar: #1A1A1A
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Acta Brand: Skandinavisch Petroleum
        primary: {
          DEFAULT: '#2C5F7C', // Primary #2C5F7C
          dark: '#1A3440',    // Secondary #1A3440
          accent: '#3D8B8B',  // Accent #3D8B8B
          50: '#e8f4f8',
          100: '#d1e9f0',
          200: '#a3d3e1',
          300: '#75bdd2',
          400: '#47a7c3',
          500: '#2C5F7C', // Primary
          600: '#234c63',
          700: '#1a394a',
          800: '#1A3440', // Secondary
          900: '#122631',
        },
        // Sidebar dark theme
        sidebar: {
          DEFAULT: '#1A1A1A',
          light: '#2A2A2A',
          lighter: '#3A3A3A',
        },
        // Acta accent
        accent: {
          DEFAULT: '#3D8B8B',
          light: '#5ba3a3',
          dark: '#2f6f6f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config