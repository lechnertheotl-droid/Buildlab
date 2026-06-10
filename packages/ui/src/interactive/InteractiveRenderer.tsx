// InteractiveRenderer.tsx — Dispatcher für interactive-Blöcke.
//
// Eiserne Regel (Schema/Registry): ein interactive-Block darf NUR eine
// componentId aus components.registry.json verwenden. Diese Liste wird über den
// ContentProvider hereingereicht; hier wird sie zur Laufzeit erzwungen:
//   - ID nicht in der Registry  → Fehler (sollte verify schon abfangen).
//   - ID in Registry, noch nicht implementiert → ruhiger „folgt"-Platzhalter.

import type { ReactNode } from 'react';
import { useContent } from '../content-context';
import type { InteractiveBlock } from '../types';
import { LeverSlider, type LeverSliderParams } from './LeverSlider';
import { ValueSlider, type ValueSliderParams } from './ValueSlider';
import { GearPair, type GearPairParams } from './GearPair';

// Implementierte Komponenten (Registry: status "implementiert"). Einträge mit
// status "geplant" erscheinen als ruhiger Platzhalter — und sind per Verifier
// nur in draft-Projekten erlaubt.
const IMPLEMENTED: Record<string, (block: InteractiveBlock) => ReactNode> = {
  'lever-slider': (block) => (
    <LeverSlider params={(block.params ?? {}) as LeverSliderParams} caption={block.caption} />
  ),
  'value-slider': (block) => (
    <ValueSlider params={(block.params ?? {}) as unknown as ValueSliderParams} caption={block.caption} />
  ),
  'gear-pair': (block) => (
    <GearPair params={(block.params ?? {}) as GearPairParams} caption={block.caption} />
  ),
};

export function InteractiveRenderer({ block }: { block: InteractiveBlock }) {
  const { componentIds } = useContent();
  const { componentId } = block;

  if (componentIds.size > 0 && !componentIds.has(componentId)) {
    return (
      <p className="rounded border border-viz-high/40 bg-paper-2 p-3 font-mono text-sm text-viz-high">
        Komponente „{componentId}" ist nicht in components.registry.json.
      </p>
    );
  }

  const render = IMPLEMENTED[componentId];
  if (!render) {
    return (
      <p className="rounded border border-dashed border-black/15 px-3 py-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
        ▸ Interaktiv: {componentId} · folgt in einer späteren Phase
      </p>
    );
  }

  return <>{render(block)}</>;
}
