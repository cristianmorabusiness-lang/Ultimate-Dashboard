import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        space: '#08080f',
        card: '#0c0c1a',
      },
      borderColor: {
        violet: {
          dim: 'rgba(109, 40, 217, 0.22)',
          glow: 'rgba(124, 58, 237, 0.45)',
        },
      },
      boxShadow: {
        violet: '0 0 32px rgba(124, 58, 237, 0.15), 0 0 1px rgba(167, 139, 250, 0.2)',
        'violet-sm': '0 0 16px rgba(124, 58, 237, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
