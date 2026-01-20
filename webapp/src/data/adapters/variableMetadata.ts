import type { VariableMetadata } from '../types/variableMetadata';

const dataBase = new URL(
  'data/',
  window.location.origin + import.meta.env.BASE_URL,
);

export async function fetchVariableMetadata(): Promise<VariableMetadata | null> {
  try {
    const url = new URL('variableMetadata.json', dataBase);
    url.searchParams.set('t', String(Date.now()));
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as VariableMetadata;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('(NO $) [fetchVariableMetadata] fetch failed:', error);
    }
    return null;
  }
}
