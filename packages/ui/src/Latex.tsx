// Latex.tsx — winziger LaTeX-Teilmengen-Renderer (SVG/HTML, KEINE Fremd-Lib).
//
// Warum kein KaTeX? Eiserne Regel 3 hält den Tech-Stack schlank, und für die
// „Antippen erklärt"-Mechanik brauchen wir saubere, einzeln adressierbare Atome
// pro Variable. Diese Datei deckt genau die Teilmenge ab, die content/formulas.json
// nutzt: \dfrac/\frac/\tfrac, Indizes (_), Hochzahlen (^), \cdot, \,, griechische
// Buchstaben. Mehr braucht das Projekt bewusst nicht.

import { Fragment, type ReactNode } from 'react';

type Tok = { t: 'cmd' | 'char' | 'open' | 'close' | 'sub' | 'sup'; v: string };

const SYMBOLS: Record<string, string> = {
  cdot: '·',
  times: '×',
  pm: '±',
  leq: '≤',
  geq: '≥',
  approx: '≈',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  eta: 'η',
  theta: 'θ',
  lambda: 'λ',
  mu: 'µ',
  nu: 'ν',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  phi: 'φ',
  omega: 'ω',
};

const SPACE_CMDS = new Set([',', ';', ' ', 'quad', 'qquad']);
const OPERATORS = new Set(['=', '+', '-', '−', '·', '×', '<', '>', '≤', '≥', '≈', '±']);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i++;
      if (i >= src.length) break;
      if (/[a-zA-Z]/.test(src[i])) {
        let name = '';
        while (i < src.length && /[a-zA-Z]/.test(src[i])) {
          name += src[i];
          i++;
        }
        toks.push({ t: 'cmd', v: name });
      } else {
        toks.push({ t: 'cmd', v: src[i] });
        i++;
      }
    } else if (c === '{') {
      toks.push({ t: 'open', v: c });
      i++;
    } else if (c === '}') {
      toks.push({ t: 'close', v: c });
      i++;
    } else if (c === '_') {
      toks.push({ t: 'sub', v: c });
      i++;
    } else if (c === '^') {
      toks.push({ t: 'sup', v: c });
      i++;
    } else if (c === ' ') {
      i++; // Quell-Leerzeichen ignorieren; Abstände kommen aus den Operatoren.
    } else {
      toks.push({ t: 'char', v: c });
      i++;
    }
  }
  return toks;
}

function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="mx-[0.15em] inline-flex flex-col items-center align-middle text-[0.95em]">
      <span className="px-[0.3em] leading-tight">{num}</span>
      <span className="my-[2px] h-px w-full bg-current" />
      <span className="px-[0.3em] leading-tight">{den}</span>
    </span>
  );
}

interface Ctx {
  k: number;
}

function atom(ch: string, ctx: Ctx): ReactNode {
  if (OPERATORS.has(ch)) {
    return (
      <span key={ctx.k++} className="mx-[0.18em]">
        {ch}
      </span>
    );
  }
  return <span key={ctx.k++}>{ch}</span>;
}

function readUnit(toks: Tok[], i: number, ctx: Ctx): [ReactNode, number] {
  const tk = toks[i];
  if (!tk) return ['', i];

  if (tk.t === 'open') {
    const [nodes, j] = parseSeq(toks, i + 1, ctx);
    const end = toks[j]?.t === 'close' ? j + 1 : j;
    return [<span key={ctx.k++}>{nodes}</span>, end];
  }

  if (tk.t === 'cmd') {
    const name = tk.v;
    if (name === 'dfrac' || name === 'frac' || name === 'tfrac') {
      const [num, j] = readUnit(toks, i + 1, ctx);
      const [den, k] = readUnit(toks, j, ctx);
      return [<Frac key={ctx.k++} num={num} den={den} />, k];
    }
    if (SYMBOLS[name]) return [atom(SYMBOLS[name], ctx), i + 1];
    if (SPACE_CMDS.has(name)) {
      return [<span key={ctx.k++} className="inline-block w-[0.28em]" />, i + 1];
    }
    if (name === '!') return [<Fragment key={ctx.k++} />, i + 1];
    // Unbekanntes Kommando: literal anzeigen statt zu raten.
    return [<span key={ctx.k++}>{name}</span>, i + 1];
  }

  if (tk.t === 'char') return [atom(tk.v, ctx), i + 1];

  return ['', i + 1];
}

function readScripted(toks: Tok[], i: number, ctx: Ctx): [ReactNode, number] {
  let [base, j] = readUnit(toks, i, ctx);
  while (toks[j] && (toks[j].t === 'sub' || toks[j].t === 'sup')) {
    const kind = toks[j].t;
    const [script, k] = readUnit(toks, j + 1, ctx);
    j = k;
    base =
      kind === 'sub' ? (
        <span key={ctx.k++} className="inline-flex items-baseline">
          {base}
          <sub className="text-[0.7em]">{script}</sub>
        </span>
      ) : (
        <span key={ctx.k++} className="inline-flex items-baseline">
          {base}
          <sup className="text-[0.7em]">{script}</sup>
        </span>
      );
  }
  return [base, j];
}

function parseSeq(toks: Tok[], start: number, ctx: Ctx): [ReactNode[], number] {
  const out: ReactNode[] = [];
  let i = start;
  while (i < toks.length && toks[i].t !== 'close') {
    const [node, j] = readScripted(toks, i, ctx);
    if (j === i) {
      i++; // Sicherung gegen Endlosschleife bei unerwartetem Token.
      continue;
    }
    out.push(<Fragment key={ctx.k++}>{node}</Fragment>);
    i = j;
  }
  return [out, i];
}

/** Rendert einen LaTeX-Teilmengen-String als React-Knoten (font-mono). */
export function Latex({ src, className }: { src: string; className?: string }) {
  const ctx: Ctx = { k: 0 };
  const [nodes] = parseSeq(tokenize(src), 0, ctx);
  return <span className={['font-mono', className].filter(Boolean).join(' ')}>{nodes}</span>;
}
