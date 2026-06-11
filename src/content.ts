// src/content.ts — Lädt den eingefrorenen Content (Projekte, Konzepte,
// Formeln, Index) und leitet App-Zustände daraus ab.
// Ableitungsregeln: DATENMODELL.md §2.2.

import formulasJson from '../content/formulas.json';
import conceptsJson from '../content/concepts.json';
import registryJson from '../components.registry.json';
import indexJson from '../content/_index.json';
import type { ProjectProgress } from './db/types';

// ── Typen (Content-seitig; UI-Typen liefert @buildlab/ui) ────────────────────
export interface ProjectMeta {
  id: string;
  title: string;
  version: number;
  level: number;
  icon: string;
  durationMin?: number;
  difficulty?: number;
  draft?: boolean;
  buildResult: string;
  challenge: string;
  recommendedAfter?: string[];
  conceptsIntroduced?: string[];
  steps: {
    id: string;
    title: string;
    goal: string;
    kind: 'lernen' | 'bauen' | 'meilenstein';
    /** Schritt-IDs, die vorher erledigt sein müssen (Projekt-Baum, VERIFICATION.md §2 R18–21). */
    requires?: string[];
    estMinutes?: number;
    finaleParts?: string[];
    blocks: unknown[];
  }[];
}

export interface ConceptMeta {
  id: string;
  name: string;
  symbol?: string;
  unit?: string;
  short: string;
  group: string;
  prerequisites: string[];
  explanation?: { intuitive?: string; practical?: string; rigorous?: string };
  relatedFormulas?: string[];
}

export interface ConceptIndexEntry {
  introducedIn: { project: string; step: string } | null;
  usedIn: { project: string; step: string }[];
}

// ── Laden ────────────────────────────────────────────────────────────────────
const NON_PROJECT = new Set(['formulas.json', 'concepts.json', '_index.json']);

const projectModules = import.meta.glob('../content/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

export const projects: ProjectMeta[] = Object.entries(projectModules)
  .filter(([path]) => !NON_PROJECT.has(path.split('/').pop() ?? ''))
  .map(([, mod]) => mod.default as ProjectMeta)
  .filter((p) => !p.draft)
  .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title, 'de'));

export const projectById = new Map(projects.map((p) => [p.id, p]));

export const formulas = formulasJson;
export const concepts = conceptsJson as ConceptMeta[];
export const conceptById = new Map(concepts.map((c) => [c.id, c]));
export const registry = registryJson;
export const componentIds = registryJson.components.map((c) => c.id);
export const conceptIndex = (indexJson as { concepts: Record<string, ConceptIndexEntry> }).concepts;

// ── Ableitungen (DATENMODELL.md §2.2) ────────────────────────────────────────

/** Unerfüllte Projekt-Empfehlungen (Soft-Lock). Unbekannte IDs zählen nicht. */
export function missingPrerequisites(
  project: ProjectMeta,
  allProgress: Record<string, ProjectProgress>,
): ProjectMeta[] {
  return (project.recommendedAfter ?? [])
    .map((id) => projectById.get(id))
    .filter((p): p is ProjectMeta => p !== undefined)
    .filter((p) => !allProgress[p.id]?.completedAt);
}

/** Restdauer eines Projekts in Minuten (Orientierung, nie Timer). */
export function remainingMinutes(project: ProjectMeta, progress?: ProjectProgress): number {
  const done = new Set(progress?.stepsDone ?? []);
  return project.steps
    .filter((s) => !done.has(s.id))
    .reduce((sum, s) => sum + (s.estMinutes ?? 8), 0);
}
