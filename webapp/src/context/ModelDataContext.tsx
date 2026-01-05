import { createContext, useContext, type ReactNode } from 'react';
import modelResultsData from '../data/modelResults.json';
import doseEffectsData from '../data/doseEffects.json';
import sampleDescriptivesData from '../data/sampleDescriptives.json';

// Types
interface StructuralPath {
  id: string;
  from: string;
  to: string;
  estimate: number;
  se: number;
  z: number;
  pvalue: number;
  std_estimate: number | null;
}

interface FitMeasures {
  df: number;
  chisq: number;
  pvalue: number;
  cfi: number;
  tli: number;
  rmsea: number;
  srmr: number;
  [key: string]: number;
}

interface DoseCoefficients {
  distress: { main: number; moderation: number; se: number };
  engagement: { main: number; moderation: number; se: number };
  adjustment: { main: number; moderation: number; se: number };
}

interface DoseEffect {
  creditDose: number;
  distressEffect: number;
  distressCI: [number, number];
  engagementEffect: number;
  engagementCI: [number, number];
  adjustmentEffect: number;
  adjustmentCI: [number, number];
}

interface ModelData {
  // Structural paths
  paths: {
    a1: StructuralPath | null;
    a1z: StructuralPath | null;
    a2: StructuralPath | null;
    a2z: StructuralPath | null;
    b1: StructuralPath | null;
    b2: StructuralPath | null;
    c: StructuralPath | null;
    cz: StructuralPath | null;
    g1: StructuralPath | null;
    g2: StructuralPath | null;
    g3: StructuralPath | null;
  };
  allPaths: StructuralPath[];
  fitMeasures: FitMeasures;
  
  // Dose-response
  doseCoefficients: DoseCoefficients;
  doseEffects: DoseEffect[];
  doseRange: { min: number; max: number; threshold: number };
  
  // Sample
  sampleSize: number;
  fastCount: number;
  fastPercent: number;
  
  // Helpers
  getPath: (id: string) => StructuralPath | null;
  getEffectAtDose: (dose: number) => {
    distress: number;
    engagement: number;
    adjustment: number;
  };
}

const ModelDataContext = createContext<ModelData | null>(null);

// Parse the JSON data
function parseModelData(): ModelData {
  const structuralPaths = modelResultsData.mainModel.structuralPaths as StructuralPath[];
  const fitMeasures = modelResultsData.mainModel.fitMeasures as FitMeasures;
  const doseCoefficients = doseEffectsData.coefficients as DoseCoefficients;
  const doseEffects = doseEffectsData.effects as DoseEffect[];
  const doseRange = doseEffectsData.creditDoseRange;
  
  // Create path lookup
  const pathMap: Record<string, StructuralPath> = {};
  structuralPaths.forEach(p => {
    pathMap[p.id] = p;
  });
  
  const getPath = (id: string) => pathMap[id] || null;
  
  // Calculate effect at any dose level
  const getEffectAtDose = (dose: number) => {
    const doseUnits = (dose - 12) / 10; // 10-credit units above threshold
    return {
      distress: doseCoefficients.distress.main + doseUnits * doseCoefficients.distress.moderation,
      engagement: doseCoefficients.engagement.main + doseUnits * doseCoefficients.engagement.moderation,
      adjustment: doseCoefficients.adjustment.main + doseUnits * doseCoefficients.adjustment.moderation,
    };
  };
  
  // Sample descriptives - uses the actual JSON structure
  const sample = sampleDescriptivesData as unknown as { 
    n: number; 
    demographics: {
      transferCredits: {
        fast: { n: number; pct: number };
        nonFast: { n: number; pct: number };
      };
    };
  };
  
  return {
    paths: {
      a1: getPath('a1'),
      a1z: getPath('a1z'),
      a2: getPath('a2'),
      a2z: getPath('a2z'),
      b1: getPath('b1'),
      b2: getPath('b2'),
      c: getPath('c'),
      cz: getPath('cz'),
      g1: getPath('g1'),
      g2: getPath('g2'),
      g3: getPath('g3'),
    },
    allPaths: structuralPaths,
    fitMeasures,
    doseCoefficients,
    doseEffects,
    doseRange: {
      min: doseRange.min,
      max: doseRange.max,
      threshold: doseRange.threshold,
    },
    sampleSize: sample.n || 5000,
    fastCount: sample.demographics?.transferCredits?.fast?.n || 0,
    fastPercent: sample.demographics?.transferCredits?.fast?.pct || 27,
    getPath,
    getEffectAtDose,
  };
}

const modelData = parseModelData();

export function ModelDataProvider({ children }: { children: ReactNode }) {
  return (
    <ModelDataContext.Provider value={modelData}>
      {children}
    </ModelDataContext.Provider>
  );
}

export function useModelData(): ModelData {
  const context = useContext(ModelDataContext);
  if (!context) {
    throw new Error('useModelData must be used within ModelDataProvider');
  }
  return context;
}

// Export raw data for components that need direct access
export { modelResultsData, doseEffectsData, sampleDescriptivesData };
