// units.ts — Anzeige-Formatierung für Einheiten-Strings aus Engine/Content.
// Engine und Schema sprechen mathjs-Syntax (N*m, m/s^2, deg); Menschen lesen
// Typografie (N·m, m/s², °). Jede UI-Stelle, die eine Einheit zeigt, geht
// hier durch — eingefügt/gerechnet wird weiterhin mathjs-Syntax.

export function formatUnit(unit: string): string {
  return unit
    .replaceAll('*', '·')
    .replaceAll('^2', '²')
    .replaceAll('^3', '³')
    .replaceAll('deg', '°');
}
