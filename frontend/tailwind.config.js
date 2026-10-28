/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
        },
        line: {
          subtle: 'var(--line-subtle)',
          active: 'var(--line-active)',
          hairline: 'rgba(255, 255, 255, 0.07)',
        },
        ink: {
          DEFAULT: 'var(--text-ink)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        tactical: {
          cyan: 'var(--laser-cyan)',
          amber: '#e69500',
          red: '#ff3b3b',
          green: '#00e599',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Space Grotesk', 'Syne', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionTimingFunction: {
        'cinematic': 'cubic-bezier(0.76, 0, 0.24, 1)',
        'snappy': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'scan': 'scanline 8s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
