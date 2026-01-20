import type { GroupComparisonsJson } from '../types/groupComparisons';

const dataBase = new URL(
  'data/',
  window.location.origin + import.meta.env.BASE_URL,
);

async function fetchJson(filename: string) {
  const url = new URL(filename, dataBase);
  url.searchParams.set('t', String(Date.now()));
  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchGroupComparisons(): Promise<GroupComparisonsJson> {
  const data = await fetchJson('groupComparisons.json');
  return data as GroupComparisonsJson;
}
