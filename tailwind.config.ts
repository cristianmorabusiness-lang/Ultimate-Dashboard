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
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        bg:        'var(--bg)',
        surface:   'var(--surface-1)',
        elevated:  'var(--surface-2)',
        border:    'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          soft:    'var(--accent-soft)',
          bg:      'var(--accent-bg)',
          fg:      'var(--accent-fg)',
        },
        text: {
          DEFAULT:   'var(--text)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          dim:       'var(--text-dim)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger:  'var(--danger)',
        info:    'var(--info)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elev: 'var(--shadow-elev)',
      },
    },
  },
  plugins: [],
}

export default config
