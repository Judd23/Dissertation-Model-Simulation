import {
  DoseEffectsDataSchema,
  ModelResultsSchema,
  SampleDescriptivesSchema,
  safeParseData,
} from "../schemas/modelData";
import type {
  ModelData,
  StructuralPath,
  FitMeasures,
  DoseCoefficients,
  DoseEffect,
  ModelDataValidation,
} from "../types/modelData";

// Parse the JSON data into stable view models.
export type ModelDataPayload = {
  modelResults?: unknown;
  doseEffects?: unknown;
  sampleDescriptives?: unknown;
};

/**
 * Build base URL for fetching data from a specific run folder.
 * Falls back to legacy /data/ path if no runId provided (for backwards compatibility during migration).
 */
function getDataBaseUrl(runId?: string): URL {
  const origin = window.location.origin + import.meta.env.BASE_URL;
  if (runId) {
    // New manifest-driven path: results/<runId>/
    return new URL(`results/${runId}/`, origin);
  }
  // Legacy path (deprecated) - will be removed after full migration
  return new URL("data/", origin);
}

async function fetchJson(filename: string, baseUrl: URL) {
  const url = new URL(filename, baseUrl);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    console.log("[ModelDataFetch] response:", {
      filename,
      status: response.status,
      ok: response.ok,
      url: url.toString(),
    });
    throw new Error(`Failed to load ${filename} (${response.status})`);
  }
  return response.json();
}

/**
 * Fetch model data from a specific run folder.
 * @param runId - The run ID to fetch data for. If omitted, falls back to legacy /data/ path.
 */
export async function fetchModelData(runId?: string): Promise<ModelData> {
  const dataBase = getDataBaseUrl(runId);
  const [modelResults, doseEffects, sampleDescriptives] = await Promise.all([
    fetchJson("modelResults.json", dataBase),
    fetchJson("doseEffects.json", dataBase),
    fetchJson("sampleDescriptives.json", dataBase),
  ]);

  return parseModelData({ modelResults, doseEffects, sampleDescriptives });
}

export function parseModelData(payload: ModelDataPayload = {}): ModelData {
  const errors: string[] = [];

  const modelResultsResult = safeParseData(
    ModelResultsSchema,
    payload.modelResults ?? null,
    "modelResults.json",
  );
  const doseEffectsResult = safeParseData(
    DoseEffectsDataSchema,
    payload.doseEffects ?? null,
    "doseEffects.json",
  );
  const sampleDescriptivesResult = safeParseData(
    SampleDescriptivesSchema,
    payload.sampleDescriptives ?? null,
    "sampleDescriptives.json",
  );

  if (!modelResultsResult.success) errors.push(modelResultsResult.error);
  if (!doseEffectsResult.success) errors.push(doseEffectsResult.error);
  if (!sampleDescriptivesResult.success)
    errors.push(sampleDescriptivesResult.error);

  const validation: ModelDataValidation = {
    isValid: errors.length === 0,
    errors,
  };

  const mainModel = modelResultsResult.success
    ? modelResultsResult.data.mainModel
    : null;
  const totalEffectModel = modelResultsResult.success
    ? modelResultsResult.data.totalEffectModel
    : null;

  const structuralPaths = mainModel
    ? (mainModel.structuralPaths as StructuralPath[])
    : [];
  const fitMeasures = mainModel
    ? (mainModel.fitMeasures as FitMeasures)
    : ({} as FitMeasures);
  const totalEffectPath = totalEffectModel
    ? ((totalEffectModel.structuralPaths as StructuralPath[]).find(
        (path) => path.id === "c_total",
      ) ?? null)
    : null;
  const doseCoefficients = doseEffectsResult.success
    ? (doseEffectsResult.data.coefficients as DoseCoefficients)
    : ({} as DoseCoefficients);

  const safeDoseCoefficients: DoseCoefficients = doseEffectsResult.success
    ? doseCoefficients
    : ({
        distress: { main: 0, moderation: 0, se: 0 },
        engagement: { main: 0, moderation: 0, se: 0 },
        adjustment: { main: 0, moderation: 0, se: 0 },
      } as DoseCoefficients);

  const doseEffects = doseEffectsResult.success
    ? (doseEffectsResult.data.effects as DoseEffect[])
    : [];
  const doseRange = doseEffectsResult.success
    ? doseEffectsResult.data.creditDoseRange
    : { min: 0, max: 0, threshold: 0, units: "" };

  // Create path lookup
  const pathMap: Record<string, StructuralPath> = {};
  structuralPaths.forEach((p) => {
    pathMap[p.id] = p;
  });

  const getPath = (id: string) => pathMap[id] || null;

  // Calculate effect at any dose level
  const getEffectAtDose = (dose: number) => {
    const doseUnits = (dose - 12) / 10; // 10-credit units above threshold
    return {
      distress:
        safeDoseCoefficients.distress.main +
        doseUnits * safeDoseCoefficients.distress.moderation,
      engagement:
        safeDoseCoefficients.engagement.main +
        doseUnits * safeDoseCoefficients.engagement.moderation,
      adjustment:
        safeDoseCoefficients.adjustment.main +
        doseUnits * safeDoseCoefficients.adjustment.moderation,
    };
  };

  const sampleSize = sampleDescriptivesResult.success
    ? sampleDescriptivesResult.data.n
    : 0;
  const fastCount = sampleDescriptivesResult.success
    ? sampleDescriptivesResult.data.demographics.fast.yes.n
    : 0;
  const fastPercent = sampleDescriptivesResult.success
    ? sampleDescriptivesResult.data.demographics.fast.yes.pct
    : 0;

  const modelSelections = {
    structural: {
      key: "mainModel",
      label: "Structural (Direct Effect) Model",
      sourcePaths: mainModel?.sourcePaths ?? {
        parameterEstimates: "",
        fitMeasures: "",
      },
    },
    totalEffect: {
      key: "totalEffectModel",
      label: "Total Effect Model",
      sourcePaths: totalEffectModel?.sourcePaths ?? {
        parameterEstimates: "",
        fitMeasures: "",
      },
    },
  };

  return {
    paths: {
      a1: getPath("a1"),
      a1z: getPath("a1z"),
      a2: getPath("a2"),
      a2z: getPath("a2z"),
      b1: getPath("b1"),
      b2: getPath("b2"),
      c: getPath("c"),
      cz: getPath("cz"),
      g1: getPath("g1"),
      g2: getPath("g2"),
      g3: getPath("g3"),
    },
    allPaths: structuralPaths,
    fitMeasures,
    totalEffectPath,
    doseCoefficients: safeDoseCoefficients,
    doseEffects,
    doseRange: {
      min: doseRange.min,
      max: doseRange.max,
      threshold: doseRange.threshold,
      units: doseRange.units ?? "",
    },
    sampleSize,
    fastCount,
    fastPercent,
    getPath,
    getEffectAtDose,
    modelSelections,
    validation,
  };
}
