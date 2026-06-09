// CadBuild.tsx — Renderer für den build-Block (Phase 3): parametrisches Bauteil.
//
// Eine geometrische Wahrheit (cad/gear.scad → OpenSCAD-WASM → STL): aus DEMSELBEN STL
// entstehen Vorschau (meshToIso) UND Download (Eiserne Regel 4). Die angezeigten Maße
// kommen aus packages/engine (Eiserne Regel 1), nie aus dem Markup. WASM wird nur im
// Effekt angefasst → SSR-sicher.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  compileGear,
  parseStl,
  validateStl,
  meshToIso,
  type Triangle,
  type GearParams,
} from '@buildlab/cad';
import { evaluateFormula } from '@buildlab/engine';
import { Latex } from '../Latex';
import { Slider } from '../Slider';
import { useContent } from '../content-context';
import { useWorkspaceStore } from '../store';
import type { BuildBlock } from '../types';
import { MeshPreview } from './MeshPreview';

const VIEW_W = 360;
const VIEW_H = 240;
const PREVIEW_FN = 24; // Vorschau-Qualität: modest halten (kleine Facet-Zahl)

interface ParamConfig {
  min: number;
  max: number;
  default: number;
  unit: string;
  label: string;
  step: number;
}

// Defaults für das Stirnrad; aus dem build-Block übersteuerbar (parameters{min,max,…}).
const GEAR_DEFAULTS: Record<string, ParamConfig> = {
  m: { min: 1, max: 4, default: 2, unit: 'mm', label: 'Modul', step: 0.5 },
  z: { min: 12, max: 40, default: 20, unit: '-', label: 'Zähnezahl', step: 1 },
  thickness: { min: 3, max: 16, default: 8, unit: 'mm', label: 'Breite', step: 1 },
  bore: { min: 2, max: 10, default: 5, unit: 'mm', label: 'Bohrung', step: 0.5 },
};
const GEAR_KEYS = ['m', 'z', 'thickness', 'bore'] as const;

function fmt(n: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
}

function mergeConfig(key: string, raw: unknown): ParamConfig {
  const base = GEAR_DEFAULTS[key] ?? { min: 0, max: 1, default: 0, unit: '-', label: key, step: 1 };
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ParamConfig>;
  return {
    min: typeof r.min === 'number' ? r.min : base.min,
    max: typeof r.max === 'number' ? r.max : base.max,
    default: typeof r.default === 'number' ? r.default : base.default,
    unit: typeof r.unit === 'string' ? r.unit : base.unit,
    label: typeof r.label === 'string' ? r.label : base.label,
    step: base.step,
  };
}

export function CadBuild({ block }: { block: BuildBlock }) {
  if (block.cadModel !== 'gear') {
    return (
      <p className="rounded border border-dashed border-black/15 px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
        ▸ CAD-Modell „{block.cadModel}" · folgt in einer späteren Phase
      </p>
    );
  }
  return <GearBuild block={block} />;
}

function GearBuild({ block }: { block: BuildBlock }) {
  const { formulas } = useContent();
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);

  const configs = useMemo(
    () => GEAR_KEYS.map((k) => [k, mergeConfig(k, block.parameters[k])] as const),
    [block.parameters],
  );

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(configs.map(([k, c]) => [k, c.default])),
  );
  const [rotation, setRotation] = useState(0);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [stl, setStl] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const params: GearParams = {
    m: values.m,
    z: values.z,
    thickness: values.thickness,
    bore: values.bore,
    fn: PREVIEW_FN,
  };

  // Eiserne Regel 1: Teilkreisdurchmesser d = m·z aus der Engine, nicht aus Markup.
  const pitch = formulas.get('pitch_d');
  const d = useMemo(() => {
    if (!pitch) return null;
    try {
      return evaluateFormula(pitch, { m: params.m, z: params.z });
    } catch {
      return null;
    }
  }, [pitch, params.m, params.z]);

  // Vorschau aus DEMSELBEN STL: kompilieren (debounced), validieren, parsen.
  useEffect(() => {
    const id = ++reqRef.current;
    setComputing(true);
    const timer = setTimeout(() => {
      compileGear(params)
        .then((out) => {
          if (id !== reqRef.current) return; // veraltet
          const check = validateStl(out);
          if (!check.ok) {
            setError(check.reason ?? 'ungültiges STL');
            setComputing(false);
            return;
          }
          setTriangles(parseStl(out));
          setStl(out);
          setError(null);
          setComputing(false);
        })
        .catch((e: unknown) => {
          if (id !== reqRef.current) return;
          setError(e instanceof Error ? e.message : String(e));
          setComputing(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [params.m, params.z, params.thickness, params.bore]);

  // Drehung ändert nur die Projektion — kein Neu-Kompilieren (gleiche Dreiecke).
  const iso = useMemo(
    () => meshToIso(triangles, { width: VIEW_W, height: VIEW_H, rotation }),
    [triangles, rotation],
  );

  // Aktuellen Kontext für den Universal-Rechner bereitstellen (SCREENS.md §7).
  useEffect(() => {
    setActive({
      formulaId: 'pitch_d',
      label: 'Teilkreisdurchmesser',
      values: { m: params.m, z: params.z },
    });
    return () => clearActive('pitch_d');
  }, [setActive, clearActive, params.m, params.z]);

  const exportable = stl !== null && validateStl(stl).ok;

  const download = () => {
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stirnrad_z${values.z}_m${fmt(values.m, 2).replace(',', '-')}.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <MeshPreview
        polygons={iso.polygons}
        width={VIEW_W}
        height={VIEW_H}
        computing={computing}
        empty={triangles.length === 0}
      />

      {/* Engine-Maß: Teilkreisdurchmesser */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm">
        <span className="flex items-baseline gap-2">
          <Latex className="text-ink" src="d" />
          <span className="text-ink">=</span>
          {d === null ? (
            <span className="text-viz-high">—</span>
          ) : (
            <span className="text-accent-ink">{fmt(d)} mm</span>
          )}
          <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
        </span>
        {error && <span className="text-xs text-viz-high">⚠ {error}</span>}
      </div>

      {/* Parameter-Slider */}
      <div className="mt-4 flex flex-col gap-4">
        {configs.map(([key, c]) => (
          <Slider
            key={key}
            label={c.label}
            value={values[key]}
            min={c.min}
            max={c.max}
            step={c.step}
            unit={c.unit}
            onChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
          />
        ))}
        <Slider
          label="Ansicht drehen"
          value={rotation}
          min={0}
          max={Math.PI * 2}
          step={Math.PI / 36}
          onChange={setRotation}
        />
      </div>

      {/* Export */}
      <div className="mt-4">
        <button
          type="button"
          onClick={download}
          disabled={!exportable}
          className="rounded border border-black/10 bg-accent px-3 py-1.5 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          ⤓ herunterladen &amp; weiterbauen
        </button>
      </div>
    </figure>
  );
}
