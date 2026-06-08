// Latex.tsx — Formel-Rendering über KaTeX.
//
// Bewusste Tech-Stack-Entscheidung (mit Rücksprache): KaTeX statt Eigenbau, damit
// auch komplexere Formeln späterer Projekte (Wurzeln, Summen, Klammern, Matrizen)
// korrekt und typografisch sauber gesetzt werden. Die Komponenten-API bleibt
// schlank (src + className), damit die „Antippen erklärt"-Variablen-Chips
// unverändert weiterlaufen. KaTeX-Knoten erben Farbe (currentColor), Tailwind-
// Textfarben am Wrapper greifen also durch.

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Rendert einen LaTeX-String als gesetzte Formel.
 * `\dfrac` & Co. erzeugen auch inline echte Display-Brüche.
 */
export function Latex({
  src,
  className,
  display,
}: {
  src: string;
  className?: string;
  display?: boolean;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(src, {
        displayMode: Boolean(display),
        throwOnError: false, // Fehler werden inline rot gezeigt, nie geworfen.
        output: 'htmlAndMathml', // MathML für Screenreader-Zugänglichkeit.
      }),
    [src, display],
  );

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
