import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Nunito', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'wake-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.55' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        'sheet-in': {
          '0%': { opacity: '0', transform: 'scale(0.2)', borderRadius: '9999px' },
          '100%': { opacity: '1', transform: 'scale(1)', borderRadius: '0' },
        },
        'zzz-float': {
          '0%': { opacity: '0', transform: 'translate(0, 4px) scale(0.7)' },
          '30%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(6px, -14px) scale(1.1)' },
        },
        'sound-ring': {
          '0%': { transform: 'scale(0.45)', opacity: '0.55' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'leaf-drift': {
          '0%': { opacity: '0', transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '15%': { opacity: '0.85' },
          '100%': { opacity: '0', transform: 'translate3d(var(--drift, 30px), -280px, 0) rotate(320deg)' },
        },
        eq: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'spotlight-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        'word-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        bob: 'bob 3.2s ease-in-out infinite',
        'wake-ring': 'wake-ring 2.4s ease-out infinite',
        'sheet-in': 'sheet-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'zzz-float': 'zzz-float 2.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sound-ring': 'sound-ring 2.6s ease-out infinite',
        'leaf-drift': 'leaf-drift 8s ease-in-out infinite',
        eq: 'eq 0.9s ease-in-out infinite',
        'spotlight-pulse': 'spotlight-pulse 3.4s ease-in-out infinite',
        'word-in': 'word-in 0.28s ease-out both',
        shimmer: 'shimmer 1.4s infinite',
        pop: 'pop 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
