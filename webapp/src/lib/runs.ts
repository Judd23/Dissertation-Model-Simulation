/**
 * Run Library data fetching utilities.
 * 
 * Fetches runs_index.json and individual run manifests using BASE_URL.
 */

// Types for run manifest and index
export interface RunManifest {
  run_id: string;
  timestamp: string;
  mode: 'smoke' | 'main' | 'Full_Deploy';
  settings?: {
    seed?: number | null;
    N?: number | null;
    estimator?: string;
    bootstrap?: number | null;
    CI?: string | null;
    group_flags?: Record<string, boolean | null>;
  };
  artifacts?: {
    fit_measures?: string;
    parameters?: string;
    executed_model_syntax?: string;
    verification_checklist?: string;
    bootstrap_results?: string;
    tables?: string[];
    figures?: string[];
  };
  python_stage_completed?: string;
}

export interface RunIndexEntry {
  run_id: string;
  timestamp: string;
  label: string;
  manifest_path: string;
}

// BASE_URL-aware path for results
const RESULTS_BASE_PATH = new URL('results', import.meta.env.BASE_URL).pathname;

/**
 * Fetch JSON with cache-busting and error handling.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const url = `${RESULTS_BASE_PATH}/${path}?t=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  
  return response.json();
}

/**
 * Fetch the runs index (list of all available runs).
 */
export async function fetchRunsIndex(): Promise<RunIndexEntry[]> {
  try {
    const runs = await fetchJson<RunIndexEntry[]>('runs_index.json');
    return Array.isArray(runs) ? runs : [];
  } catch (error) {
    console.warn('[runs] Failed to fetch runs_index.json:', error);
    return [];
  }
}

/**
 * Fetch a specific run's manifest.
 */
export async function fetchRunManifest(runId: string): Promise<RunManifest | null> {
  try {
    return await fetchJson<RunManifest>(`${runId}/manifest.json`);
  } catch (error) {
    console.warn(`[runs] Failed to fetch manifest for ${runId}:`, error);
    return null;
  }
}

/**
 * Get the full URL for a run artifact.
 */
export function getArtifactUrl(runId: string, relativePath: string): string {
  return `${RESULTS_BASE_PATH}/${runId}/${relativePath}`;
}

/**
 * Format timestamp for display.
 */
export function formatRunTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

/**
 * Get mode badge color class.
 */
export function getModeColor(mode: string): string {
  switch (mode) {
    case 'smoke':
      return 'var(--color-warning, #f59e0b)';
    case 'Full_Deploy':
      return 'var(--color-success, #10b981)';
    default:
      return 'var(--color-primary, #3b82f6)';
  }
}
