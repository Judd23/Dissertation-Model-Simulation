import type { SampleDescriptives } from '../types/sampleDescriptives';

const DATA_BASE_PATH = '/data';

async function fetchJson(filename: string) {
  const response = await fetch(`${DATA_BASE_PATH}/${filename}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    console.log('(NO $) [ModelDataFetch] response:', { filename, status: response.status, ok: response.ok });
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchSampleDescriptives(): Promise<SampleDescriptives> {
  const data = await fetchJson('sampleDescriptives.json');
  return data as SampleDescriptives;
}
