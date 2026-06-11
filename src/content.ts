// src/content.ts — Lädt den eingefrorenen Content (Projekte, Konzepte, Formeln,
// Index, Skill-Map-Layout, Trainings-Pools) und leitet App-Zustände daraus ab.
// Ableitungsregeln: DATENMODELL.md §2.2, Empfehlung: LERNMODELL.md §9.

import formulasJson from '../content/formulas.json';
import conceptsJson from '../content/concepts.json';
import registryJson from '../components.registry.json';
import indexJson from '../content/_index.json';
import layoutJson from '../content/skillmap.layout.json';
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

export interface SkillmapLayout {
  groups: { id: string; label: string; x: number; y: number }[];
  nodes: { conceptId: string; x: number; y: number }[];
}

export interface TrainingTaskRaw {
  type: 'task';
  kind: string;
  question: string;
  concepts: string[];
  [key: string]: unknown;
}

export interface TrainingPool {
  group: string;
  tasks: TrainingTaskRaw[];
}

// ── Laden ────────────────────────────────────────────────────────────────────
const NON_PROJECT = new Set(['formulas.json', 'concepts.json', 'skillmap.layout.json', '_index.json']);

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

const trainingModules = import.meta.glob('../content/training/*.json', { eager: true }) as Record<
  string,
  { default: TrainingPool }
>;
export const trainingPools: TrainingPool[] = Object.values(trainingModules).map((m) => m.default);

export const formulas = formulasJson;
export const concepts = conceptsJson as ConceptMeta[];
export const conceptById = new Map(concepts.map((c) => [c.id, c]));
export const registry = registryJson;
export const componentIds = registryJson.components.map((c) => c.id);
export const conceptIndex = (indexJson as { concepts: Record<string, ConceptIndexEntry> }).concepts;
export const skillmapLayout = layoutJson as unknown as SkillmapLayout;

// ── Ableitungen (DATENMODELL.md §2.2) ────────────────────────────────────────
export type ProjectStatus = 'empfohlen' | 'offen' | 'begonnen' | 'fertig' | 'voraussetzung';

export function projectStatus(
  project: ProjectMeta,
  allProgress: Record<string, ProjectProgress>,
  recommendedId: string | null,
): ProjectStatus {
  const progress = allProgress[project.id];
  if (progress?.completedAt) return 'fertig';
  if (progress) return 'begonnen';
  if (project.id === recommendedId) return 'empfohlen';
  if (missingPrerequisites(project, allProgress).length > 0) return 'voraussetzung';
  return 'offen';
}

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

/**
 * „Als Nächstes“ (LERNMODELL.md §9): erstes nicht begonnene Projekt mit
 * erfüllten Empfehlungen; bei mehreren das mit den meisten gemeisterten Konzepten.
 */
export function recommendNext(
  allProgress: Record<string, ProjectProgress>,
  masteredConcepts: Set<string>,
): ProjectMeta | null {
  const candidates = projects
    .filter((p) => !allProgress[p.id])
    .filter((p) => missingPrerequisites(p, allProgress).length === 0);
  if (candidates.length === 0) return null;
  const score = (p: ProjectMeta) =>
    (p.conceptsIntroduced ?? []).filter((c) => masteredConcepts.has(c)).length;
  return candidates.sort((a, b) => score(b) - score(a) || a.level - b.level)[0];
}

/** Persona-Empfehlung fürs Onboarding (LERNMODELL.md §9). */
export const PERSONA_START: Record<string, string> = {
  studium: 'fachwerkbruecke',
  azubi: 'hebel-flaschenzug',
  maker: 'stirnradgetriebe',
};

export function personaStartProject(persona: string | undefined): ProjectMeta {
  return personaStart(persona).project;
}

/**
 * Start-Empfehlung inkl. Ehrlichkeits-Flag: `fallback` ist true, wenn das
 * kuratierte Wunschprojekt der Persona (PERSONA_START) noch nicht als Content
 * existiert und stattdessen ein Ersatz empfohlen wird — das Onboarding sagt
 * das dann dazu, statt den Ersatz als Maßanfertigung auszugeben.
 */
export function personaStart(persona: string | undefined): { project: ProjectMeta; fallback: boolean } {
  const wanted = persona ? PERSONA_START[persona] : undefined;
  const project = (wanted && projectById.get(wanted)) || projects[0];
  return { project, fallback: !!wanted && !projectById.get(wanted) };
}

/** Restdauer eines Projekts in Minuten (Orientierung, nie Timer). */
export function remainingMinutes(project: ProjectMeta, progress?: ProjectProgress): number {
  const done = new Set(progress?.stepsDone ?? []);
  return project.steps
    .filter((s) => !done.has(s.id))
    .reduce((sum, s) => sum + (s.estMinutes ?? 8), 0);
}
