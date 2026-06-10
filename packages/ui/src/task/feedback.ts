// task/feedback.ts — Feedback-Heuristiken der Stufe 1 (ENGINE_SPEC.md §4,
// Microcopy aus VOICE.md §5). Reihenfolge der Prüfung ist verbindlich;
// die erste zutreffende Heuristik gewinnt.

export type Heuristic = 'zehnerpotenz' | 'vorzeichen' | 'kehrwert' | 'knapp' | 'neutral';

export const HEURISTIC_TEXT: Record<Heuristic, string> = {
  zehnerpotenz:
    'Die Ziffern stimmen — prüf die Einheiten, da ist eine Zehnerpotenz verrutscht.',
  vorzeichen: 'Betrag richtig, Richtung falsch. Was zieht, was drückt?',
  kehrwert: 'Du hast den Kehrwert erwischt — welcher Wert gehört in den Zähler?',
  knapp: 'Fast! Prüf deine Rundung — rechne mit mehr Nachkommastellen weiter.',
  neutral: 'Noch nicht ganz. Welche Formel passt zu dieser Größe?',
};

const near = (x: number, ref: number, rel: number) =>
  Math.abs(x - ref) <= rel * Math.abs(ref);

/** Wählt den heuristischen Hinweis für eine falsche numerische Eingabe. */
export function classifyMiss(input: number, expected: number, tolerance: number): Heuristic {
  for (let k = -6; k <= 6; k++) {
    if (k === 0) continue;
    const shifted = expected * 10 ** k;
    if (shifted !== 0 && near(input, shifted, 0.02)) return 'zehnerpotenz';
  }
  if (expected !== 0 && near(input, -expected, tolerance)) return 'vorzeichen';
  if (expected !== 0 && near(input, 1 / expected, 0.02)) return 'kehrwert';
  if (near(input, expected, 2 * tolerance)) return 'knapp';
  return 'neutral';
}

/** Positive Quittungen — variieren, nie zwei gleiche hintereinander. */
const PRAISE = ['Sitzt.', 'Genau so.', 'Passt — weiter im Takt.', 'Sauber gerechnet.'];
let lastPraise = -1;
export function praise(): string {
  let i = Math.floor(Math.random() * PRAISE.length);
  if (i === lastPraise) i = (i + 1) % PRAISE.length;
  lastPraise = i;
  return PRAISE[i];
}

/** Akzeptiert Komma UND Punkt als Dezimaltrenner (ENGINE_SPEC.md §3). */
export function parseGermanNumber(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

/** Numerische Antwort innerhalb relativer Toleranz? */
export function isWithin(input: number, expected: number, tolerance: number): boolean {
  return (
    Number.isFinite(input) &&
    Math.abs(input - expected) <= Math.max(tolerance * Math.abs(expected), Number.EPSILON)
  );
}
