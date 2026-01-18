import type { FastComparison } from '../types/fastComparison';

const DATA_BASE_PATH = '/data';

async function fetchJson(filename: string) {
  const response = await fetch(`${DATA_BASE_PATH}/${filename}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchFastComparison(): Promise<FastComparison> {
  const data = await fetchJson('fastComparison.json');
  return data as FastComparison;
}
