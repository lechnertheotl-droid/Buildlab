/** @type {import('tailwindcss').Config} */
// Tokens stammen verbindlich aus DESIGN.md (Eiserne Regel 8). Werte werden als
// CSS-Variablen in src/index.css gesetzt; hier nur referenziert.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './packages/*/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        'paper-sink': 'var(--paper-sink)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-faint': 'var(--ink-faint)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
      },
    },
  },
  plugins: [],
};
