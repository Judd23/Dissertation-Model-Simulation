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
    console.log("(NO $) [FastComparisonFetch] response:", {
      filename,
      status: response.status,
      ok: response.ok,
    });
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

export async function fetchFastComparison(): Promise<FastComparison> {
  const data = await fetchJson("fastComparison.json");
  return data as FastComparison;
}
