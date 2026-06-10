// motion.ts — der eine Reduced-Motion-Check (DESIGN.md §7):
// System-Präferenz ODER App-Einstellung (html.bl-reduced-motion).
// SSR-sicher: ohne document gilt „reduziert" (kein Animations-Start im Test).

export function reducedMotionActive(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.classList.contains('bl-reduced-motion')) return true;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
