/**
 * Reader state.
 *
 * Every access is wrapped: a private window, blocked site data, or a full quota
 * must cost the reader their bookmarks, not the book. When storage is
 * unavailable the same interface is served from memory for the session.
 */
export const SCHEMA_VERSION = 1;
const KEY = 'interactive-macro/v1';

export interface PredictionRecord {
  id: string;
  at: string;
  predicted: Record<string, 'up' | 'down' | 'none'>;
  actual: Record<string, 'up' | 'down' | 'none'>;
  correct: boolean;
}

export interface SortingRecord {
  id: string;
  at: string;
  score: number;
  total: number;
}

export interface PersistedState {
  schemaVersion: number;
  visited: Record<string, string>;
  predictions: PredictionRecord[];
  sorting: SortingRecord[];
}

const EMPTY: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  visited: {},
  predictions: [],
  sorting: [],
};

let memory: PersistedState | null = null;
let storageWorks = true;

function read(): PersistedState {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return { ...EMPTY };
    return {
      schemaVersion: SCHEMA_VERSION,
      visited: parsed.visited ?? {},
      predictions: parsed.predictions ?? [],
      sorting: parsed.sorting ?? [],
    };
  } catch {
    storageWorks = false;
    return { ...EMPTY };
  }
}

function write(next: PersistedState): void {
  memory = next;
  if (!storageWorks) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    storageWorks = false;
  }
}

export function loadProgress(): PersistedState {
  const state = read();
  memory = state;
  return state;
}

export function markVisited(sectionId: string): PersistedState {
  const state = read();
  const next = { ...state, visited: { ...state.visited, [sectionId]: new Date().toISOString() } };
  write(next);
  return next;
}

export function recordPrediction(record: PredictionRecord): PersistedState {
  const state = read();
  const next = {
    ...state,
    predictions: [...state.predictions.filter((p) => p.id !== record.id), record],
  };
  write(next);
  return next;
}

export function recordSorting(record: SortingRecord): PersistedState {
  const state = read();
  const next = { ...state, sorting: [...state.sorting.filter((s) => s.id !== record.id), record] };
  write(next);
  return next;
}

export function resetProgress(): PersistedState {
  write({ ...EMPTY });
  return { ...EMPTY };
}

export function storageAvailable(): boolean {
  return storageWorks;
}
