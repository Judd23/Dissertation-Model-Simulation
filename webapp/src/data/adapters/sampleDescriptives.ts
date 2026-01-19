import type { SampleDescriptives } from '../types/sampleDescriptives';

const DATA_BASE_PATH = new URL('data', import.meta.env.BASE_URL).pathname;

async function fetchJson(filename: string) {
  const response = await fetch(`${DATA_BASE_PATH}/${filename}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchSampleDescriptives(): Promise<SampleDescriptives> {
  const data = await fetchJson('sampleDescriptives.json');
  return data as SampleDescriptives;
}
