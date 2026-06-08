// content-context.tsx — stellt Formeln & Konzepte als Lookup bereit.
// Die App lädt content/formulas.json + content/concepts.json und reicht sie hier
// hinein; die Renderer ziehen sich daraus, ohne Pfade selbst zu kennen.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Concept, Formula } from './types';

interface ContentData {
  formulas: Map<string, Formula>;
  concepts: Map<string, Concept>;
}

const ContentContext = createContext<ContentData | null>(null);

export function ContentProvider({
  formulas,
  concepts,
  children,
}: {
  formulas: Formula[];
  concepts: Concept[];
  children: ReactNode;
}) {
  const value = useMemo<ContentData>(
    () => ({
      formulas: new Map(formulas.map((f) => [f.id, f])),
      concepts: new Map(concepts.map((c) => [c.id, c])),
    }),
    [formulas, concepts],
  );
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentData {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent muss innerhalb von <ContentProvider> stehen.');
  return ctx;
}
