import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        brand: {
          teal: { 50: '#E6F7F7', 100: '#CCEFEF', 200: '#99DFDF', 300: '#66CFCF', 400: '#33BFBF', 500: '#006B6B', 600: '#005A5A', 700: '#004D4D', 800: '#003D3D', 900: '#002E2E' },
          gold: { 50: '#FFF9E6', 100: '#FFF3CC', 300: '#FFDB66', 400: '#FFCF33', 500: '#E8A020', 600: '#D4910F', 700: '#B37A0D' },
        },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)', xl: '1rem', '2xl': '1.5rem', '3xl': '2rem' },
      fontFamily: { sans: ['Inter', 'var(--font-sans)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(0,107,107,0.35), 0 0 40px rgba(0,107,107,0.15)',
        'glow-gold': '0 0 20px rgba(232,160,32,0.35)',
        'card': '0 4px 24px -4px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 16px 48px -8px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)',
        'glass': '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-fast': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'shimmer': { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'glow-pulse': { '0%,100%': { boxShadow: '0 0 12px rgba(0,107,107,0.3)' }, '50%': { boxShadow: '0 0 28px rgba(0,107,107,0.6)' } },
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'gradient': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'shimmer': 'shimmer 2.5s infinite linear',
        'glow-pulse': 'glow-pulse 2.5s infinite',
        'float': 'float 4s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
