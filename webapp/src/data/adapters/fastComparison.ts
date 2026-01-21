import type { FastComparison } from "../types/fastComparison";

function getBaseUrl(runId?: string): URL {
  const origin = window.location.origin + import.meta.env.BASE_URL;
  if (runId) {
    return new URL(`results/${runId}/`, origin);
  }
  return new URL("data/", origin);
}

async function fetchJson(filename: string, runId?: string): Promise<unknown | null> {
  const baseUrl = getBaseUrl(runId);
  const url = new URL(filename, baseUrl);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    console.warn("[FastComparisonFetch] missing or unavailable JSON", {
      filename,
      runId,
      status: response.status,
      ok: response.ok,
    });
    return null;
  }
  return response.json();
}

export async function fetchFastComparison(runId?: string): Promise<FastComparison> {
  const data = await fetchJson("fastComparison.json", runId);
  // If the file is missing, return an empty object so the UI can render a
  // friendly "data unavailable" state instead of crashing.
  return (data ?? {}) as FastComparison;
}
