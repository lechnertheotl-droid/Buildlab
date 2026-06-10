// useCountUp — Motion „zaehlen" (DESIGN.md §8): die Zahl zählt per rAF in
// 300 ms zum neuen Wert, Mono-Anzeige ohne Layout-Verschiebung. Reduzierte
// Bewegung (§7: System-Präferenz ODER App-Einstellung) → sofortiger Endwert.

import { useEffect, useRef, useState } from 'react';
import { reducedMotionActive } from './primitives/motion';

export function useCountUp(target: number, duration = 300): number {
  const [value, setValue] = useState(target);
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target || !Number.isFinite(target) || reducedMotionActive()) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      shown.current = t >= 1 ? target : from + (target - from) * eased;
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
