export interface StructuralPath {
  id: string;
  from: string;
  to: string;
  estimate: number;
  se: number;
  z: number;
  pvalue: number;
  std_estimate: number | null;
}

export interface FitMeasures {
  df: number;
  chisq: number;
  pvalue: number;
  cfi: number;
  tli: number;
  rmsea: number;
  srmr: number;
  [key: string]: number;
}

export interface ModelSourcePaths {
  parameterEstimates: string;
  fitMeasures: string;
}

export interface ModelSelection {
  key: 'mainModel' | 'totalEffectModel';
  label: string;
  sourcePaths: ModelSourcePaths;
}

export interface DoseCoefficients {
  distress: { main: number; moderation: number; se: number };
  engagement: { main: number; moderation: number; se: number };
  adjustment: { main: number; moderation: number; se: number };
}

export interface DoseEffect {
  creditDose: number;
  distressEffect: number;
  distressCI: [number, number];
  engagementEffect: number;
  engagementCI: [number, number];
  adjustmentEffect: number;
  adjustmentCI: [number, number];
}

export interface ModelData {
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
  totalEffectPath: StructuralPath | null;

  // Dose-response
  doseCoefficients: DoseCoefficients;
  doseEffects: DoseEffect[];
  doseRange: { min: number; max: number; threshold: number; units?: string };

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
  modelSelections: {
    structural: ModelSelection;
    totalEffect: ModelSelection;
  };

  validation: ModelDataValidation;
}

export interface ModelDataValidation {
  isValid: boolean;
  errors: string[];
}
