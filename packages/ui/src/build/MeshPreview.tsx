// MeshPreview.tsx — isometrische SVG-Vorschau eines Dreiecks-Mesh (Eiserne Regel 3).
//
// Rein präsentational: bekommt fertig projizierte, schattierte Polygone aus
// @buildlab/cad (meshToIso) und zeichnet sie als <polygon>-Stapel. Nutzt ausschließlich
// DESIGN.md-Tokens (paper-Karte, Hairline-Rahmen, weicher Tiefenschatten) — gleiche
// visuelle Sprache wie der LeverSlider.

import type { IsoPolygon } from '@buildlab/cad';

export function MeshPreview({
  polygons,
  width,
  height,
  computing,
  empty,
}: {
  polygons: IsoPolygon[];
  width: number;
  height: number;
  computing?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded"
        role="img"
        aria-label="Isometrische CAD-Vorschau des parametrischen Bauteils"
      >
        <defs>
          <clipPath id="cad-field">
            <rect x={0} y={0} width={width} height={height} rx={6} />
          </clipPath>
          <linearGradient id="cad-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--paper-2)" />
            <stop offset="0.6" stopColor="var(--paper)" />
            <stop offset="1" stopColor="var(--paper-sink)" />
          </linearGradient>
          <filter id="cad-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
            <feOffset dy="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#cad-field)">
          <rect x={0} y={0} width={width} height={height} fill="url(#cad-bg)" />
          {/* Der Mesh-Körper: flach schattierte Facetten, fern→nah sortiert. */}
          <g filter="url(#cad-soft)" stroke="#00000018" strokeWidth={0.4} strokeLinejoin="round">
            {polygons.map((poly, i) => (
              <polygon key={i} points={poly.points} fill={poly.fill} />
            ))}
          </g>
        </g>

        {/* Sauberer Hairline-Rahmen obenauf */}
        <rect
          x={4.5}
          y={4.5}
          width={width - 9}
          height={height - 9}
          rx={4}
          fill="none"
          stroke="#00000022"
          strokeWidth={1}
        />

        {empty && !computing && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            className="fill-ink-faint font-mono"
            style={{ fontSize: 12 }}
          >
            Vorschau folgt …
          </text>
        )}
      </svg>

      {computing && (
        <span className="absolute right-3 top-3 rounded bg-paper-2/90 px-2 py-0.5 font-mono text-xs text-ink-faint">
          berechne …
        </span>
      )}
    </div>
  );
}
