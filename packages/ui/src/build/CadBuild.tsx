// CadBuild.tsx — Renderer für den build-Block: parametrisches Bauteil.
//
// Eine geometrische Wahrheit (cad/gear.scad → OpenSCAD-WASM → STL): aus DEMSELBEN STL
// entstehen Vorschau (meshToIso) UND Download (Eiserne Regel 4). Die angezeigten Maße
// kommen aus packages/engine (Eiserne Regel 1), nie aus dem Markup.
//
// Redesign: build.constraints werden live über die Engine geprüft (✓/✗ je Zeile,
// SCREENS.md §6.2); der STL-Download ist erst aktiv, wenn alle erfüllt sind.
// Ein Radpaar (Parameter z1 UND z2) bekommt einen „Rad 1 / Rad 2"-Umschalter —
// beide Räder stammen aus demselben parametrischen Modell.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  compileGear,
  compilePulley,
  compileRakete,
  compileBruecke,
  parseStl,
  validateStl,
  meshToIso,
  type Triangle,
  type GearParams,
  type PulleyParams,
  type RaketeParams,
  type BrueckeParams,
} from '@buildlab/cad';
import {
  computeRocket,
  evaluateExpr,
  evaluateFormula,
  solveBridge,
} from '@buildlab/engine';
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

const GEAR_DEFAULTS: Record<string, ParamConfig> = {
  m: { min: 1, max: 4, default: 2, unit: 'mm', label: 'Modul', step: 0.5 },
  z: { min: 12, max: 40, default: 20, unit: '-', label: 'Zähnezahl', step: 1 },
  z1: { min: 12, max: 40, default: 20, unit: '-', label: 'Zähne Antrieb', step: 1 },
  z2: { min: 30, max: 120, default: 60, unit: '-', label: 'Zähne Abtrieb', step: 1 },
  thickness: { min: 3, max: 16, default: 8, unit: 'mm', label: 'Breite', step: 1 },
  bore: { min: 2, max: 10, default: 5, unit: 'mm', label: 'Bohrung', step: 0.5 },
};

function fmt(n: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
}

const ROLLE_DEFAULTS: Record<string, ParamConfig> = {
  d: { min: 20, max: 60, default: 40, unit: 'mm', label: 'Außendurchmesser', step: 2 },
  groove: { min: 1, max: 4, default: 1.5, unit: 'mm', label: 'Rillenradius', step: 0.25 },
  bore: { min: 4, max: 12, default: 8, unit: 'mm', label: 'Bohrung', step: 0.5 },
  thickness: { min: 8, max: 20, default: 12, unit: 'mm', label: 'Breite', step: 1 },
  d_seil: { min: 2, max: 6, default: 4, unit: 'mm', label: 'Dein Seildurchmesser', step: 0.5 },
};

const BRUECKE_DEFAULTS: Record<string, ParamConfig> = {
  preset: { min: 1, max: 2, default: 1, unit: '-', label: 'Bauart', step: 1 },
  h: { min: 60, max: 170, default: 112.5, unit: 'mm', label: 'Fachwerkhöhe', step: 2.5 },
  b: { min: 4, max: 10, default: 7, unit: 'mm', label: 'Stabbreite', step: 0.5 },
  tiefe: { min: 6, max: 14, default: 8, unit: 'mm', label: 'Bautiefe', step: 1 },
};

const RAKETE_DEFAULTS: Record<string, ParamConfig> = {
  d: { min: 21, max: 32, default: 24, unit: 'mm', label: 'Rohrdurchmesser', step: 1 },
  tubeLen: { min: 140, max: 320, default: 220, unit: 'mm', label: 'Rohrlänge', step: 5 },
  noseLen: { min: 40, max: 120, default: 80, unit: 'mm', label: 'Nasenlänge', step: 5 },
  finRoot: { min: 30, max: 90, default: 60, unit: 'mm', label: 'Wurzeltiefe der Finnen', step: 2 },
  finTip: { min: 10, max: 60, default: 30, unit: 'mm', label: 'Spitzentiefe der Finnen', step: 2 },
  finSpan: { min: 20, max: 60, default: 40, unit: 'mm', label: 'Spannweite der Finnen', step: 2 },
  finCount: { min: 3, max: 6, default: 4, unit: '-', label: 'Finnenzahl', step: 1 },
  ballast: { min: 0, max: 20, default: 8, unit: 'g', label: 'Ballast in der Nase', step: 1 },
};

function mergeConfig(key: string, raw: unknown, defaults: Record<string, ParamConfig> = GEAR_DEFAULTS): ParamConfig {
  const base = defaults[key] ?? { min: 0, max: 1, default: 0, unit: '-', label: key, step: 1 };
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

export interface CadBuildProps {
  block: BuildBlock;
  /** Wird beim erfolgreichen STL-Export gerufen (Bau-Eintrag für den Produkt-Knoten der Projektkarte). */
  onExport?: (params: Record<string, number>, label: string) => void;
}

export function CadBuild({ block, onExport }: CadBuildProps) {
  if (block.cadModel === 'gear') return <GearBuild block={block} onExport={onExport} />;
  if (block.cadModel === 'rolle') return <RolleBuild block={block} onExport={onExport} />;
  if (block.cadModel === 'rakete') return <RaketeBuild block={block} onExport={onExport} />;
  if (block.cadModel === 'bruecke') return <BrueckeBuild block={block} onExport={onExport} />;
  return (
    <p className="rounded border border-dashed border-black/15 px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
      ▸ CAD-Modell „{block.cadModel}" · folgt in einer späteren Phase
    </p>
  );
}

function GearBuild({ block, onExport }: CadBuildProps) {
  const { formulas } = useContent();
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);
  const setCanvasInputs = useWorkspaceStore((s) => s.setCanvasInputs);
  const setBuildOk = useWorkspaceStore((s) => s.setBuildOk);

  const paramKeys = useMemo(() => Object.keys(block.parameters), [block.parameters]);
  const isPair = paramKeys.includes('z1') && paramKeys.includes('z2');
  const configs = useMemo(
    () => paramKeys.map((k) => [k, mergeConfig(k, block.parameters[k])] as const),
    [paramKeys, block.parameters],
  );

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(configs.map(([k, c]) => [k, c.default])),
  );
  const [wheel, setWheel] = useState<1 | 2>(1);
  const [rotation, setRotation] = useState(0);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [stl, setStl] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const activeZ = isPair ? (wheel === 1 ? values.z1 : values.z2) : values.z;
  const params: GearParams = {
    m: values.m,
    z: activeZ,
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

  // Constraints live prüfen (Engine-Auswertung über die aktuellen Parameter).
  const constraints = useMemo(
    () =>
      (block.constraints ?? []).map((c) => {
        try {
          return { label: c.label, ok: evaluateExpr(c.expr, values) === true };
        } catch {
          return { label: c.label, ok: false };
        }
      }),
    [block.constraints, values],
  );
  const allConstraintsOk = constraints.every((c) => c.ok);

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
    // params ist aus values abgeleitet — die Einzelfelder sind die echten Deps.
  }, [params.m, params.z, params.thickness, params.bore]);

  // Drehung ändert nur die Projektion — kein Neu-Kompilieren (gleiche Dreiecke).
  const iso = useMemo(
    () => meshToIso(triangles, { width: VIEW_W, height: VIEW_H, rotation }),
    [triangles, rotation],
  );

  // Kontext für Rechner + target-Aufgaben bereitstellen.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    setActive({
      formulaId: 'pitch_d',
      label: 'Teilkreisdurchmesser',
      values: { m: values.m, z: activeZ },
    });
    setCanvasInputs(values);
    return () => clearActive('pitch_d');
    // valuesKey repräsentiert values inhaltlich.
  }, [setActive, clearActive, setCanvasInputs, valuesKey, activeZ]);

  // Constraint-Stand fürs Schritt-Gating publizieren: ein Bau-Schritt ist erst
  // erledigt, wenn alle Anforderungen grün sind (vorher zählte er sofort als ✓).
  useEffect(() => {
    setBuildOk(allConstraintsOk);
    return () => setBuildOk(null);
  }, [setBuildOk, allConstraintsOk]);

  const exportable = stl !== null && validateStl(stl).ok && allConstraintsOk;

  const download = () => {
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = isPair
      ? `stirnrad_rad${wheel}_z${activeZ}_m${fmt(values.m, 2).replace(',', '-')}`
      : `stirnrad_z${activeZ}_m${fmt(values.m, 2).replace(',', '-')}`;
    a.href = url;
    a.download = `${name}.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onExport?.(
      { ...values },
      isPair ? `Stirnrad ${wheel === 1 ? 'Antrieb' : 'Abtrieb'} z=${activeZ}` : `Stirnrad z=${activeZ}`,
    );
  };

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      {isPair && (
        <div className="mb-3 inline-flex rounded border border-black/10" role="radiogroup" aria-label="Welches Rad anzeigen?">
          {([1, 2] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={wheel === w}
              onClick={() => setWheel(w)}
              className={`min-h-11 px-4 font-mono text-sm outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-accent ${
                wheel === w ? 'bg-accent text-paper' : 'bg-paper-sink/40 text-ink-2 hover:text-ink'
              }`}
            >
              Rad {w} · z={w === 1 ? values.z1 : values.z2}
            </button>
          ))}
        </div>
      )}

      <MeshPreview
        polygons={iso.polygons}
        edges={iso.edges}
        width={VIEW_W}
        height={VIEW_H}
        computing={computing}
        empty={triangles.length === 0}
      />

      {/* Engine-Maß: Teilkreisdurchmesser */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm" aria-live="polite">
        <span className="flex items-baseline gap-2">
          <Latex className="text-ink" src="d" />
          <span className="text-ink">=</span>
          {d === null ? (
            <span className="text-fehl">—</span>
          ) : (
            <span className="text-accent-ink">{fmt(d)} mm</span>
          )}
          <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
        </span>
        {error && <span className="text-xs text-fehl">⚠ Das Modell mag diese Werte nicht — stell einen Parameter zurück.</span>}
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
          value={Math.round((rotation * 180) / Math.PI)}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={(v) => setRotation((v * Math.PI) / 180)}
        />
      </div>

      {/* Anforderungen (build.constraints) — jede Zeile engine-geprüft */}
      {constraints.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-black/10 pt-3" aria-label="Anforderungen">
          {constraints.map((c, idx) => (
            <li key={idx} className={`flex items-center gap-2 font-mono text-sm ${c.ok ? 'text-ok' : 'text-fehl'}`}>
              <span aria-hidden>{c.ok ? '✓' : '✗'}</span>
              <span className="text-ink-2">{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stückliste zugeklappt (SCREENS.md §6.2) */}
      {(block.bom?.length ?? 0) > 0 && (
        <details className="mt-3 text-sm text-ink-2">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-accent">
            ▸ Stückliste
          </summary>
          <ul className="mt-1 list-inside list-disc">
            {block.bom!.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Export — erst wenn alle Anforderungen erfüllt sind */}
      <div className="mt-4">
        <button
          type="button"
          onClick={download}
          disabled={!exportable}
          title={allConstraintsOk ? undefined : 'Erst alle Anforderungen erfüllen — die Liste oben zeigt, wo es hakt.'}
          className="min-h-11 rounded border border-black/10 bg-accent px-4 text-sm text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⤓ STL herunterladen
        </button>
        {isPair && (
          <p className="mt-1.5 text-xs text-ink-faint">
            Fürs Getriebe brauchst du beide Räder — wechsle oben auf Rad {wheel === 1 ? 2 : 1} und
            lade nochmal.
          </p>
        )}
      </div>
    </figure>
  );
}

// ── Umlenkrolle (Testbefund B-20): dasselbe Muster wie GearBuild, ein Modell,
//    eine Wahrheit — rolle.scad liefert Vorschau UND STL. Der Seildurchmesser
//    ist kein Geometrie-Parameter, sondern die Auslegungsgröße, gegen die die
//    Rille geprüft wird (Constraint + Engine-Formel groove_min).

/** Druckspiel [mm] — Eingabe an die Engine-Formel groove_min (Variable `spiel`). */
const ROLLE_SPIEL = 0.3;

function RolleBuild({ block, onExport }: CadBuildProps) {
  const { formulas } = useContent();
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);
  const setCanvasInputs = useWorkspaceStore((s) => s.setCanvasInputs);
  const setBuildOk = useWorkspaceStore((s) => s.setBuildOk);

  const paramKeys = useMemo(() => Object.keys(block.parameters), [block.parameters]);
  const configs = useMemo(
    () => paramKeys.map((k) => [k, mergeConfig(k, block.parameters[k], ROLLE_DEFAULTS)] as const),
    [paramKeys, block.parameters],
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

  const params: PulleyParams = {
    d: values.d,
    groove: values.groove,
    bore: values.bore,
    thickness: values.thickness,
    fn: 32,
  };

  // Eiserne Regel 1: der Mindest-Rillenradius kommt aus der Engine (groove_min).
  const grooveMinFormula = formulas.get('groove_min');
  const grooveMin = useMemo(() => {
    if (!grooveMinFormula) return null;
    try {
      return evaluateFormula(grooveMinFormula, { d_seil: values.d_seil, spiel: ROLLE_SPIEL });
    } catch {
      return null;
    }
  }, [grooveMinFormula, values.d_seil]);

  // Constraints live prüfen (Engine-Auswertung über die aktuellen Parameter).
  const constraints = useMemo(
    () =>
      (block.constraints ?? []).map((c) => {
        try {
          return { label: c.label, ok: evaluateExpr(c.expr, values) === true };
        } catch {
          return { label: c.label, ok: false };
        }
      }),
    [block.constraints, values],
  );
  const allConstraintsOk = constraints.every((c) => c.ok);

  // Vorschau aus DEMSELBEN STL: kompilieren (debounced), validieren, parsen.
  useEffect(() => {
    const id = ++reqRef.current;
    setComputing(true);
    const timer = setTimeout(() => {
      compilePulley(params)
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
    // params ist aus values abgeleitet — die Einzelfelder sind die echten Deps.
  }, [params.d, params.groove, params.bore, params.thickness]);

  const iso = useMemo(
    () => meshToIso(triangles, { width: VIEW_W, height: VIEW_H, rotation }),
    [triangles, rotation],
  );

  // Kontext für Rechner + target-Aufgaben bereitstellen.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    setActive({
      formulaId: 'groove_min',
      label: 'Mindest-Rillenradius',
      values: { d_seil: values.d_seil, spiel: ROLLE_SPIEL },
    });
    setCanvasInputs(values);
    return () => clearActive('groove_min');
    // valuesKey repräsentiert values inhaltlich.
  }, [setActive, clearActive, setCanvasInputs, valuesKey]);

  // Constraint-Stand fürs Schritt-Gating publizieren (wie beim GearBuild).
  useEffect(() => {
    setBuildOk(allConstraintsOk);
    return () => setBuildOk(null);
  }, [setBuildOk, allConstraintsOk]);

  const exportable = stl !== null && validateStl(stl).ok && allConstraintsOk;

  const download = () => {
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = `rolle_d${fmt(values.d, 0)}_seil${fmt(values.d_seil, 1).replace(',', '-')}`;
    a.href = url;
    a.download = `${name}.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onExport?.({ ...values }, `Umlenkrolle Ø${fmt(values.d, 0)} mm`);
  };

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <MeshPreview
        polygons={iso.polygons}
        edges={iso.edges}
        width={VIEW_W}
        height={VIEW_H}
        computing={computing}
        empty={triangles.length === 0}
      />

      {/* Engine-Maß: Mindest-Rillenradius für den gewählten Seildurchmesser */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm" aria-live="polite">
        <span className="flex items-baseline gap-2">
          <Latex className="text-ink" src="r_{min}" />
          <span className="text-ink">=</span>
          {grooveMin === null ? (
            <span className="text-fehl">—</span>
          ) : (
            <span className="text-accent-ink">{fmt(grooveMin)} mm</span>
          )}
          <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
        </span>
        {error && <span className="text-xs text-fehl">⚠ Das Modell mag diese Werte nicht — stell einen Parameter zurück.</span>}
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
          value={Math.round((rotation * 180) / Math.PI)}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={(v) => setRotation((v * Math.PI) / 180)}
        />
      </div>

      {/* Anforderungen (build.constraints) — jede Zeile engine-geprüft */}
      {constraints.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-black/10 pt-3" aria-label="Anforderungen">
          {constraints.map((c, idx) => (
            <li key={idx} className={`flex items-center gap-2 font-mono text-sm ${c.ok ? 'text-ok' : 'text-fehl'}`}>
              <span aria-hidden>{c.ok ? '✓' : '✗'}</span>
              <span className="text-ink-2">{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stückliste zugeklappt (SCREENS.md §6.2) */}
      {(block.bom?.length ?? 0) > 0 && (
        <details className="mt-3 text-sm text-ink-2">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-accent">
            ▸ Stückliste
          </summary>
          <ul className="mt-1 list-inside list-disc">
            {block.bom!.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Export — erst wenn alle Anforderungen erfüllt sind */}
      <div className="mt-4">
        <button
          type="button"
          onClick={download}
          disabled={!exportable}
          title={allConstraintsOk ? undefined : 'Erst alle Anforderungen erfüllen — die Liste oben zeigt, wo es hakt.'}
          className="min-h-11 rounded border border-black/10 bg-accent px-4 text-sm text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⤓ STL herunterladen
        </button>
        <p className="mt-1.5 text-xs text-ink-faint">
          Für den Flaschenzug brauchst du zwei Rollen — druck die Datei einfach zweimal.
        </p>
      </div>
    </figure>
  );
}

// ── Modellrakete: dasselbe Muster, ein Modell (cad/rakete.scad), zwei druckbare
//    Teile (Rumpf mit Finnen + Motorschacht, Nase mit Steckschulter). Der
//    Ballast ist kein Geometrie-Parameter — er geht ins Massenmodell der Engine
//    und in die Stabilitäts-Constraints, löst aber kein Neu-Kompilieren aus.

function RaketeBuild({ block, onExport }: CadBuildProps) {
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);
  const setCanvasInputs = useWorkspaceStore((s) => s.setCanvasInputs);
  const setBuildOk = useWorkspaceStore((s) => s.setBuildOk);

  const paramKeys = useMemo(() => Object.keys(block.parameters), [block.parameters]);
  const configs = useMemo(
    () => paramKeys.map((k) => [k, mergeConfig(k, block.parameters[k], RAKETE_DEFAULTS)] as const),
    [paramKeys, block.parameters],
  );

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(configs.map(([k, c]) => [k, c.default])),
  );
  const [part, setPart] = useState<'rumpf' | 'nase'>('rumpf');
  const [rotation, setRotation] = useState(0);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [stl, setStl] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const params: RaketeParams = {
    part,
    d: values.d,
    tubeLen: values.tubeLen,
    noseLen: values.noseLen,
    finRoot: values.finRoot,
    finTip: values.finTip,
    finSpan: values.finSpan,
    finCount: values.finCount,
    fn: 32,
  };

  // Eiserne Regel 1: Stabilitätsmaß aus dem Engine-Massenmodell (computeRocket),
  // dieselbe Mathematik wie die Constraint-Ausdrücke (Paritätstest in der Engine).
  const stability = useMemo(() => {
    try {
      return computeRocket({
        d: values.d,
        tubeLen: values.tubeLen,
        noseLen: values.noseLen,
        finRoot: values.finRoot,
        finTip: values.finTip,
        finSpan: values.finSpan,
        finCount: values.finCount,
        ballast: values.ballast ?? 0,
      }).stability;
    } catch {
      return null;
    }
  }, [values]);

  // Constraints live prüfen (Engine-Auswertung über die aktuellen Parameter).
  const constraints = useMemo(
    () =>
      (block.constraints ?? []).map((c) => {
        try {
          return { label: c.label, ok: evaluateExpr(c.expr, values) === true };
        } catch {
          return { label: c.label, ok: false };
        }
      }),
    [block.constraints, values],
  );
  const allConstraintsOk = constraints.every((c) => c.ok);

  // Vorschau aus DEMSELBEN STL: kompilieren (debounced), validieren, parsen.
  // Der Ballast fehlt bewusst in den Deps — er ändert die Geometrie nicht.
  useEffect(() => {
    const id = ++reqRef.current;
    setComputing(true);
    const timer = setTimeout(() => {
      compileRakete(params)
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
    // params ist aus values abgeleitet — die Einzelfelder sind die echten Deps.
  }, [params.part, params.d, params.tubeLen, params.noseLen, params.finRoot, params.finTip, params.finSpan, params.finCount]);

  const iso = useMemo(
    () => meshToIso(triangles, { width: VIEW_W, height: VIEW_H, rotation }),
    [triangles, rotation],
  );

  // Kontext für Rechner + target-Aufgaben bereitstellen.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    const r = computeRocket({
      d: values.d,
      tubeLen: values.tubeLen,
      noseLen: values.noseLen,
      finRoot: values.finRoot,
      finTip: values.finTip,
      finSpan: values.finSpan,
      finCount: values.finCount,
      ballast: values.ballast ?? 0,
    });
    setActive({
      formulaId: 'stability',
      label: 'Stabilitätsmaß',
      values: { xcp: r.xcp, xcg: r.xcg, d: values.d },
    });
    setCanvasInputs(values);
    return () => clearActive('stability');
    // valuesKey repräsentiert values inhaltlich.
  }, [setActive, clearActive, setCanvasInputs, valuesKey]);

  // Constraint-Stand fürs Schritt-Gating publizieren (wie beim GearBuild).
  useEffect(() => {
    setBuildOk(allConstraintsOk);
    return () => setBuildOk(null);
  }, [setBuildOk, allConstraintsOk]);

  const exportable = stl !== null && validateStl(stl).ok && allConstraintsOk;

  const download = () => {
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = `rakete_${part}_d${fmt(values.d, 0)}_l${fmt(values.noseLen + values.tubeLen, 0)}`;
    a.href = url;
    a.download = `${name}.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onExport?.({ ...values }, part === 'rumpf' ? 'Raketen-Rumpf mit Finnen' : 'Raketen-Nase');
  };

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <div className="mb-3 inline-flex rounded border border-black/10" role="radiogroup" aria-label="Welches Teil anzeigen?">
        {(['rumpf', 'nase'] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={part === p}
            onClick={() => setPart(p)}
            className={`min-h-11 px-4 font-mono text-sm outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-accent ${
              part === p ? 'bg-accent text-paper' : 'bg-paper-sink/40 text-ink-2 hover:text-ink'
            }`}
          >
            {p === 'rumpf' ? 'Rumpf' : 'Nase'}
          </button>
        ))}
      </div>

      <MeshPreview
        polygons={iso.polygons}
        edges={iso.edges}
        width={VIEW_W}
        height={VIEW_H}
        computing={computing}
        empty={triangles.length === 0}
      />

      {/* Engine-Maß: Stabilitätsmaß über das ganze Design (nicht nur das Teil) */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm" aria-live="polite">
        <span className="flex items-baseline gap-2">
          <Latex className="text-ink" src="S" />
          <span className="text-ink">=</span>
          {stability === null ? (
            <span className="text-fehl">—</span>
          ) : (
            <span className="text-accent-ink">{fmt(stability, 2)} Kaliber</span>
          )}
          <span className="ml-1 text-xs text-ink-faint">aus der Engine</span>
        </span>
        {error && <span className="text-xs text-fehl">⚠ Das Modell mag diese Werte nicht — stell einen Parameter zurück.</span>}
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
          value={Math.round((rotation * 180) / Math.PI)}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={(v) => setRotation((v * Math.PI) / 180)}
        />
      </div>

      {/* Anforderungen (build.constraints) — jede Zeile engine-geprüft */}
      {constraints.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-black/10 pt-3" aria-label="Anforderungen">
          {constraints.map((c, idx) => (
            <li key={idx} className={`flex items-center gap-2 font-mono text-sm ${c.ok ? 'text-ok' : 'text-fehl'}`}>
              <span aria-hidden>{c.ok ? '✓' : '✗'}</span>
              <span className="text-ink-2">{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stückliste zugeklappt (SCREENS.md §6.2) */}
      {(block.bom?.length ?? 0) > 0 && (
        <details className="mt-3 text-sm text-ink-2">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-accent">
            ▸ Stückliste
          </summary>
          <ul className="mt-1 list-inside list-disc">
            {block.bom!.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Export — erst wenn alle Anforderungen erfüllt sind */}
      <div className="mt-4">
        <button
          type="button"
          onClick={download}
          disabled={!exportable}
          title={allConstraintsOk ? undefined : 'Erst alle Anforderungen erfüllen — die Liste oben zeigt, wo es hakt.'}
          className="min-h-11 rounded border border-black/10 bg-accent px-4 text-sm text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⤓ STL herunterladen
        </button>
        <p className="mt-1.5 text-xs text-ink-faint">
          Du brauchst beide Teile — wechsle oben auf {part === 'rumpf' ? '„Nase"' : '„Rumpf"'} und lade nochmal.
        </p>
      </div>
    </figure>
  );
}

// ── Fachwerkbrücke: zwei Bauarten (Dreieck, Trapez) aus bridgePreset, dazu
//    Fachwerkhöhe, Stabbreite und Bautiefe. Anders als bei den anderen Modellen
//    zeigt die Engine-Zeile hier die ECHTEN Stabkräfte aus dem Löser — nicht
//    nur ein abgeleitetes Maß. Die Constraints tragen dieselbe Statik als
//    geschlossene Ausdrücke; ein Anti-Drift-Test hält beides deckungsgleich.

/** Prüflast der Challenge: 5 kg mittig. */
const BRUECKE_LAST = 49.05;

function BrueckeBuild({ block, onExport }: CadBuildProps) {
  const setActive = useWorkspaceStore((s) => s.setActive);
  const clearActive = useWorkspaceStore((s) => s.clearActive);
  const setCanvasInputs = useWorkspaceStore((s) => s.setCanvasInputs);
  const setBuildOk = useWorkspaceStore((s) => s.setBuildOk);

  const paramKeys = useMemo(() => Object.keys(block.parameters), [block.parameters]);
  const configs = useMemo(
    () => paramKeys.map((k) => [k, mergeConfig(k, block.parameters[k], BRUECKE_DEFAULTS)] as const),
    [paramKeys, block.parameters],
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

  const params: BrueckeParams = {
    preset: values.preset,
    h: values.h,
    b: values.b,
    tiefe: values.tiefe,
    fn: 32,
  };

  // Eiserne Regel 1: die Stabkräfte kommen aus dem Löser, nicht aus dem Markup.
  const statik = useMemo(() => {
    try {
      const sol = solveBridge(values.preset, values.h, BRUECKE_LAST);
      const druck = Math.min(...sol.barForces);
      const zug = Math.max(...sol.barForces);
      return { maxAbs: sol.maxAbs, druck: Math.abs(druck), zug, label: sol.label };
    } catch {
      return null;
    }
  }, [values.preset, values.h]);

  const constraints = useMemo(
    () =>
      (block.constraints ?? []).map((c) => {
        try {
          return { label: c.label, ok: evaluateExpr(c.expr, values) === true };
        } catch {
          return { label: c.label, ok: false };
        }
      }),
    [block.constraints, values],
  );
  const allConstraintsOk = constraints.every((c) => c.ok);

  // Vorschau aus DEMSELBEN STL: kompilieren (debounced), validieren, parsen.
  useEffect(() => {
    const id = ++reqRef.current;
    setComputing(true);
    const timer = setTimeout(() => {
      compileBruecke(params)
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
    // params ist aus values abgeleitet — die Einzelfelder sind die echten Deps.
  }, [params.preset, params.h, params.b, params.tiefe]);

  const iso = useMemo(
    () => meshToIso(triangles, { width: VIEW_W, height: VIEW_H, rotation }),
    [triangles, rotation],
  );

  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    setActive({
      formulaId: 'beam_reaction',
      label: 'Auflagerkraft der Prüflast',
      values: { F: BRUECKE_LAST },
    });
    setCanvasInputs(values);
    return () => clearActive('beam_reaction');
    // valuesKey repräsentiert values inhaltlich.
  }, [setActive, clearActive, setCanvasInputs, valuesKey]);

  useEffect(() => {
    setBuildOk(allConstraintsOk);
    return () => setBuildOk(null);
  }, [setBuildOk, allConstraintsOk]);

  const exportable = stl !== null && validateStl(stl).ok && allConstraintsOk;

  const download = () => {
    if (!stl) return;
    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const art = values.preset === 2 ? 'trapez' : 'dreieck';
    const name = `bruecke_${art}_h${fmt(values.h, 0)}_b${fmt(values.b, 1).replace(',', '-')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.stl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onExport?.({ ...values }, `Fachwerkbrücke ${statik?.label ?? art}, h = ${fmt(values.h, 0)} mm`);
  };

  // Die Bauart ist kein Schieberegler, sondern eine Entscheidung — deshalb
  // Segment-Umschalter. Sie bleibt aber ein Bau-Parameter, damit die
  // Constraints (und damit der Meilenstein) sie sehen.
  const presetConfig = configs.find(([k]) => k === 'preset');
  const sliderConfigs = configs.filter(([k]) => k !== 'preset');

  return (
    <figure className="rounded border border-black/10 bg-paper-2 p-4 shadow">
      <MeshPreview
        polygons={iso.polygons}
        edges={iso.edges}
        width={VIEW_W}
        height={VIEW_H}
        computing={computing}
        empty={triangles.length === 0}
      />

      {/* Engine-Zeile: die echten Stabkräfte deiner Brücke unter 5 kg */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm" aria-live="polite">
        {statik === null ? (
          <span className="text-fehl">— Fachwerk nicht lösbar</span>
        ) : (
          <>
            <span>
              größte Druckkraft = <span className="text-accent-ink">{fmt(statik.druck)} N</span>
            </span>
            <span>
              größte Zugkraft = <span className="text-accent-ink">{fmt(statik.zug)} N</span>
            </span>
            <span className="text-xs text-ink-faint">aus dem Fachwerk-Löser, bei 49,05 N mittig</span>
          </>
        )}
        {error && (
          <span className="text-xs text-fehl">
            ⚠ Das Modell mag diese Werte nicht — stell einen Parameter zurück.
          </span>
        )}
      </div>

      {/* Bauart als Segment-Umschalter */}
      {presetConfig && (
        <div className="mt-4">
          <span className="text-sm text-ink-2">{presetConfig[1].label}</span>
          <div className="mt-1.5 inline-flex overflow-hidden rounded border border-black/10">
            {[
              { wert: 1, name: 'Dreieck' },
              { wert: 2, name: 'Trapez' },
            ].map((o) => (
              <button
                key={o.wert}
                type="button"
                aria-pressed={values.preset === o.wert}
                onClick={() => setValues((prev) => ({ ...prev, preset: o.wert }))}
                className={`min-h-11 px-4 font-mono text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  values.preset === o.wert ? 'bg-accent text-paper' : 'bg-paper text-ink-2 hover:bg-paper-sink'
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parameter-Slider */}
      <div className="mt-4 flex flex-col gap-4">
        {sliderConfigs.map(([key, c]) => (
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
          value={Math.round((rotation * 180) / Math.PI)}
          min={0}
          max={360}
          step={5}
          unit="°"
          onChange={(v) => setRotation((v * Math.PI) / 180)}
        />
      </div>

      {/* Anforderungen (build.constraints) — jede Zeile engine-geprüft */}
      {constraints.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-black/10 pt-3" aria-label="Anforderungen">
          {constraints.map((c, idx) => (
            <li key={idx} className={`flex items-center gap-2 font-mono text-sm ${c.ok ? 'text-ok' : 'text-fehl'}`}>
              <span aria-hidden>{c.ok ? '✓' : '✗'}</span>
              <span className="text-ink-2">{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stückliste zugeklappt (SCREENS.md §6.2) */}
      {(block.bom?.length ?? 0) > 0 && (
        <details className="mt-3 text-sm text-ink-2">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-accent">
            ▸ Stückliste
          </summary>
          <ul className="mt-1 list-inside list-disc">
            {block.bom!.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Export — erst wenn alle Anforderungen erfüllt sind */}
      <div className="mt-4">
        <button
          type="button"
          onClick={download}
          disabled={!exportable}
          title={allConstraintsOk ? undefined : 'Erst alle Anforderungen erfüllen — die Liste oben zeigt, wo es hakt.'}
          className="min-h-11 rounded border border-black/10 bg-accent px-4 text-sm text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⤓ STL herunterladen
        </button>
        <p className="mt-1.5 text-xs text-ink-faint">
          Druck die Scheibe zweimal und verbinde sie mit kurzen Querstäben — erst als
          Paar steht die Brücke von allein.
        </p>
      </div>
    </figure>
  );
}
