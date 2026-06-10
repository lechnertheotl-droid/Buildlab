// announce.ts — eine globale, visuell versteckte aria-live-Region für Ansagen,
// die nicht an ein Element gebunden sind (z. B. Schätz-Slider beim Ziehen).
// Debounced, damit Screenreader nicht mit Zwischenwerten geflutet werden.

import { useCallback, useEffect, useRef } from 'react';

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.className = 'sr-only';
  document.body.appendChild(region);
  return region;
}

export function useAnnounce(debounceMs = 400): (text: string) => void {
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return useCallback(
    (text: string) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const r = ensureRegion();
        // Erst leeren, damit auch identische Texte erneut angesagt werden.
        r.textContent = '';
        r.textContent = text;
      }, debounceMs);
    },
    [debounceMs],
  );
}
