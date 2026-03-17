import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1720',
        sand: '#f3efe6',
        coral: '#d86c4d',
        moss: '#6d7c47',
        cloud: '#f8fafc',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
        body: ['IBM Plex Sans', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 50px rgba(15, 23, 32, 0.08)',
      },
      backgroundImage: {
        grain: 'radial-gradient(circle at top, rgba(216, 108, 77, 0.16), transparent 38%), radial-gradient(circle at bottom right, rgba(109, 124, 71, 0.18), transparent 32%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
