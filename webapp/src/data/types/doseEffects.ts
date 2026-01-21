export interface CreditDoseRange {
  min: number;
  max: number;
  threshold: number;
  units?: string;
  centeringConstant?: number;
}

export interface DoseCoefficient {
  main: number;
  moderation: number;
  se: number;
}

export interface DoseCoefficients {
  distress: DoseCoefficient;
  engagement: DoseCoefficient;
  adjustment: DoseCoefficient;
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

export interface JohnsonNeymanPoints {
  distress: { lower: number | null; upper: number | null };
  engagement: { crossover: number | null };
}

export interface DoseEffectsData {
  creditDoseRange: CreditDoseRange;
  coefficients: DoseCoefficients;
  effects: DoseEffect[];
  johnsonNeymanPoints: JohnsonNeymanPoints;
}
