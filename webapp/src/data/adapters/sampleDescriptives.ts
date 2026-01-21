import type { SampleDescriptives } from "../types/sampleDescriptives";

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
    console.warn("[SampleDescriptivesFetch] missing or unavailable JSON", {
      filename,
      runId,
      status: response.status,
      ok: response.ok,
    });
    return null;
  }
  return response.json();
}

export async function fetchSampleDescriptives(runId?: string): Promise<SampleDescriptives | null> {
  const data = await fetchJson("sampleDescriptives.json", runId);
  if (!data) return null;
  return data as SampleDescriptives;
}
