import type { FastComparison } from "../types/fastComparison";

const dataBase = new URL(
  "data/",
  window.location.origin + import.meta.env.BASE_URL,
);

async function fetchJson(filename: string) {
  const url = new URL(filename, dataBase);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    console.warn("[FastComparisonFetch] missing or unavailable JSON", {
      filename,
      status: response.status,
      ok: response.ok,
    });
    return null;
  }
  return response.json();
}

export async function fetchFastComparison(): Promise<FastComparison> {
  const data = await fetchJson("fastComparison.json");
  // Return an empty object if the file is missing; the UI should render a
  // friendly "data unavailable" state rather than crashing.
  return (data ?? {}) as FastComparison;
}
