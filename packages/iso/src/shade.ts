// shade.ts — Schattierung als Tiefenmittel (CLAUDE.md: Tiefe über Schattierung).
// Reine Farbarithmetik auf Hex-Strings, damit pseudo-3D-Flächen ohne WebGL
// plastisch wirken. Bleibt im DESIGN.md-Tokenset: Eingabefarben kommen von dort,
// hier wird nur heller/dunkler abgestuft.

export type Face = 'top' | 'left' | 'right' | 'front';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Mischt eine Farbe Richtung Weiß (amount > 0) oder Schwarz (amount < 0).
 * amount ∈ [-1, 1]: -1 = schwarz, 0 = unverändert, 1 = weiß.
 */
export function shade(hex: string, amount: number): string {
  const a = Math.max(-1, Math.min(1, amount));
  const { r, g, b } = parseHex(hex);
  const target = a >= 0 ? 255 : 0;
  const t = Math.abs(a);
  return toHex({
    r: r + (target - r) * t,
    g: g + (target - g) * t,
    b: b + (target - b) * t,
  });
}

// Helligkeit je Fläche eines isometrischen Körpers: oben am hellsten (Licht von
// oben), dann rechts, links am dunkelsten — der klassische pseudo-3D-Eindruck.
const FACE_AMOUNT: Record<Face, number> = {
  top: 0.18,
  front: 0,
  right: -0.1,
  left: -0.24,
};

/** Schattiert eine Grundfarbe passend zur Orientierung der Fläche. */
export function faceShade(hex: string, face: Face): string {
  return shade(hex, FACE_AMOUNT[face]);
}

/**
 * Stufenlose Schattierung aus der Flächennormalen (Lambert + Ambient).
 * faceShade kennt nur vier diskrete Flächen; gekrümmte Mäntel — Zahnkranz,
 * Rolle, Rumpf — bleiben damit flach. DESIGN.md §6 verlangt für jede sichtbare
 * Fläche eine Abstufung, das liefert diese Funktion für beliebige Normalen.
 *
 * Licht steht standardmäßig links-oben-vorn, passend zur Iso-Bühne.
 * `amount` skaliert den Ausschlag (Default ±0,3 um die Grundfarbe).
 */
export function shadeByNormal(
  hex: string,
  normal: { x: number; y: number; z: number },
  opts: { light?: { x: number; y: number; z: number }; ambient?: number; amount?: number } = {},
): string {
  const light = opts.light ?? { x: -0.4, y: -0.5, z: 1 };
  const ambient = opts.ambient ?? 0.35;
  const amount = opts.amount ?? 0.3;
  const nl = Math.hypot(normal.x, normal.y, normal.z) || 1;
  const ll = Math.hypot(light.x, light.y, light.z) || 1;
  const dot = (normal.x * light.x + normal.y * light.y + normal.z * light.z) / (nl * ll);
  // Beleuchtung in [0, 1], dann auf [-amount, +amount] um die Grundfarbe abbilden.
  const lit = ambient + (1 - ambient) * Math.max(0, dot);
  return shade(hex, (lit * 2 - 1) * amount);
}
