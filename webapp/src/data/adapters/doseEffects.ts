import type { DoseEffectsData } from "../types/doseEffects";

function getBaseUrl(runId?: string): URL {
  const origin = window.location.origin + import.meta.env.BASE_URL;
  if (runId) {
    return new URL(`results/${runId}/`, origin);
  }
  return new URL("data/", origin);
}

async function fetchJson(runId?: string): Promise<DoseEffectsData | null> {
  const baseUrl = getBaseUrl(runId);
  const url = new URL("doseEffects.json", baseUrl);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as DoseEffectsData;
}

export async function fetchDoseEffects(
  runId?: string,
): Promise<DoseEffectsData | null> {
  try {
    let data = await fetchJson(runId);
    // Fall back to legacy data/ if run-specific not found
    if (!data && runId) {
      data = await fetchJson(undefined);
    }
    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[fetchDoseEffects] fetch failed:", error);
    }
    return null;
  }
}
