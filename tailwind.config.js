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
        'paper-3': 'var(--paper-3)',
        'paper-sink': 'var(--paper-sink)',
        'paper-deep': 'var(--paper-deep)',
        ink: 'var(--ink)',
        'ink-strong': 'var(--ink-strong)',
        'ink-2': 'var(--ink-2)',
        'ink-faint': 'var(--ink-faint)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'viz-low': 'var(--viz-low)',
        'viz-mid': 'var(--viz-mid)',
        'viz-high': 'var(--viz-high)',
        // Semantische Feedback-Aliasse (DESIGN.md §5) — immer diese fürs Feedback.
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        fehl: 'var(--fehl)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      // Type-Scale (DESIGN.md §2) — benannte Größen statt ad-hoc text-[…].
      fontSize: {
        'display-xl': ['3.25rem', { lineHeight: '1.04', letterSpacing: '-0.025em', fontWeight: '700' }],
        display: ['2.75rem', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['2rem', { lineHeight: '1.12', letterSpacing: '-0.015em', fontWeight: '600' }],
        title: ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        lead: ['1.125rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        2: 'var(--shadow-2)',
      },
    },
  },
  plugins: [],
};
