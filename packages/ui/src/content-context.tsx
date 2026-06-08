// content-context.tsx — stellt Formeln & Konzepte als Lookup bereit.
// Die App lädt content/formulas.json + content/concepts.json und reicht sie hier
// hinein; die Renderer ziehen sich daraus, ohne Pfade selbst zu kennen.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Concept, Formula } from './types';

interface ContentData {
  formulas: Map<string, Formula>;
  concepts: Map<string, Concept>;
  /** Erlaubte componentIds aus components.registry.json (Phase 2). */
  componentIds: Set<string>;
}

const ContentContext = createContext<ContentData | null>(null);

export function ContentProvider({
  formulas,
  concepts,
  componentIds,
  children,
}: {
  formulas: Formula[];
  concepts: Concept[];
  componentIds?: string[];
  children: ReactNode;
}) {
  const value = useMemo<ContentData>(
    () => ({
      formulas: new Map(formulas.map((f) => [f.id, f])),
      concepts: new Map(concepts.map((c) => [c.id, c])),
      componentIds: new Set(componentIds ?? []),
    }),
    [formulas, concepts, componentIds],
  );
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentData {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent muss innerhalb von <ContentProvider> stehen.');
  return ctx;
}
