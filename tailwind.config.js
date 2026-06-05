/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          'Cabinet Grotesk',
          'Segoe UI',
          'system-ui',
          'sans-serif'
        ],
        sans: [
          'Satoshi',
          'Segoe UI',
          'system-ui', 
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        accent: '#E8630A',
        'accent-hover': '#FF8C42',
        surface: {
          base: '#0D0D0D',
          card: '#141414',
          elevated: '#1C1C1C',
          overlay: '#242424',
        },
        text: {
          primary: '#F5F0EB',
          secondary: '#9A9080',
          muted: '#5A5248',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        }
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      boxShadow: {
        accent: '0 0 32px rgba(232,99,10,0.2)',
        glow: '0 0 64px rgba(232,99,10,0.15)',
        card: '0 4px 24px rgba(0,0,0,0.5)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease forwards',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4,0,0.2,1) forwards',
        'slide-right': 'slideRight 300ms cubic-bezier(0.4,0,0.2,1) forwards',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.4,0,0.2,1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'equalizer': 'equalizer 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { 
            transform: 'translateY(16px)', 
            opacity: '0' 
          },
          to: { 
            transform: 'translateY(0)', 
            opacity: '1' 
          },
        },
        slideRight: {
          from: { 
            transform: 'translateX(-16px)', 
            opacity: '0' 
          },
          to: { 
            transform: 'translateX(0)', 
            opacity: '1' 
          },
        },
        scaleIn: {
          from: { 
            transform: 'scale(0.96)', 
            opacity: '0' 
          },
          to: { 
            transform: 'scale(1)', 
            opacity: '1' 
          },
        },
        glowPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 32px rgba(232,99,10,0.2)' 
          },
          '50%': { 
            boxShadow: '0 0 64px rgba(232,99,10,0.4)' 
          },
        },
        equalizer: {
          from: { transform: 'scaleY(0.3)' },
          to: { transform: 'scaleY(1)' },
        }
      }
    }
  },
  safelist: [
    'animate-fade-in',
    'animate-slide-up',
    'animate-slide-right',
    'animate-scale-in',
    'animate-glow-pulse',
    'animate-equalizer',
    'glass',
    'glass-strong',
    'glow-accent',
    'surface-card',
    'surface-elevated',
    'btn-accent',
    'interactive',
    'text-display',
    'text-heading-1',
    'text-heading-2',
    'text-heading-3',
    'text-body',
    'text-body-sm',
    'text-label',
    'text-mono',
  ],
  plugins: [],
}
