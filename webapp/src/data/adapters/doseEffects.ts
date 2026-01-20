import type { DoseEffectsData } from "../types/doseEffects";

const dataBase = new URL(
  "data/",
  window.location.origin + import.meta.env.BASE_URL,
);

export async function fetchDoseEffects(): Promise<DoseEffectsData | null> {
  try {
    const url = new URL("doseEffects.json", dataBase);
    url.searchParams.set("t", String(Date.now()));
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as DoseEffectsData;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("(NO $) [fetchDoseEffects] fetch failed:", error);
    }
    return null;
  }
}
