import type { GroupComparisonsJson } from '../types/groupComparisons';

const DATA_BASE_PATH = '/data';

async function fetchJson(filename: string) {
  const response = await fetch(`${DATA_BASE_PATH}/${filename}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchGroupComparisons(): Promise<GroupComparisonsJson> {
  const data = await fetchJson('groupComparisons.json');
  return data as GroupComparisonsJson;
}
