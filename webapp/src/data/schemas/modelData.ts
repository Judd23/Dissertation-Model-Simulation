/**
 * Zod schemas for validating JSON data files
 * 
 * These schemas ensure type safety and provide runtime validation
 * for all data loaded into the application.
 */

import { z } from 'zod';

// =============================================================================
// Structural Path Schema
// =============================================================================

export const StructuralPathSchema = z.object({
  id: z.string().min(1, 'Path ID is required'),
  from: z.string().min(1, 'Source variable is required'),
  to: z.string().min(1, 'Target variable is required'),
  estimate: z.number().finite('Estimate must be a finite number'),
  se: z.number().nonnegative('Standard error must be non-negative'),
  z: z.number().finite('Z-value must be a finite number'),
  pvalue: z.number().min(0).max(1, 'P-value must be between 0 and 1'),
  std_estimate: z.number().nullable(),
});

export type StructuralPath = z.infer<typeof StructuralPathSchema>;

// =============================================================================
// Fit Measures Schema
// =============================================================================

export const FitMeasuresSchema = z.object({
  df: z.number().int().nonnegative('Degrees of freedom must be non-negative'),
  chisq: z.number().nonnegative('Chi-square must be non-negative'),
  pvalue: z.number().min(0).max(1, 'P-value must be between 0 and 1'),
  cfi: z.number().min(0).max(1, 'CFI must be between 0 and 1'),
  tli: z.number().finite('TLI must be a finite number'),
  rmsea: z.number().nonnegative('RMSEA must be non-negative'),
  srmr: z.number().nonnegative('SRMR must be non-negative'),
}).catchall(z.number());

export type FitMeasures = z.infer<typeof FitMeasuresSchema>;

// =============================================================================
// Model Results Schema
// =============================================================================

export const ModelSourcePathsSchema = z.object({
  parameterEstimates: z.string().min(1, 'Parameter estimates path is required'),
  fitMeasures: z.string().min(1, 'Fit measures path is required'),
});

export const ModelResultSchema = z.object({
  structuralPaths: z.array(StructuralPathSchema),
  fitMeasures: FitMeasuresSchema,
  sourcePaths: ModelSourcePathsSchema,
});

export const ModelResultsSchema = z.object({
  mainModel: ModelResultSchema,
  totalEffectModel: ModelResultSchema,
});

export type ModelResults = z.infer<typeof ModelResultsSchema>;

// =============================================================================
// Dose Effects Schema
// =============================================================================

export const DoseCoefficientsSchema = z.object({
  distress: z.object({
    main: z.number().finite(),
    moderation: z.number().finite(),
    se: z.number().nonnegative(),
  }),
  engagement: z.object({
    main: z.number().finite(),
    moderation: z.number().finite(),
    se: z.number().nonnegative(),
  }),
  adjustment: z.object({
    main: z.number().finite(),
    moderation: z.number().finite(),
    se: z.number().nonnegative(),
  }),
});

export type DoseCoefficients = z.infer<typeof DoseCoefficientsSchema>;

export const DoseEffectSchema = z.object({
  creditDose: z.number().nonnegative(),
  distressEffect: z.number().finite(),
  distressCI: z.tuple([z.number().finite(), z.number().finite()]),
  engagementEffect: z.number().finite(),
  engagementCI: z.tuple([z.number().finite(), z.number().finite()]),
  adjustmentEffect: z.number().finite(),
  adjustmentCI: z.tuple([z.number().finite(), z.number().finite()]),
});

export type DoseEffect = z.infer<typeof DoseEffectSchema>;

export const DoseEffectsDataSchema = z.object({
  coefficients: DoseCoefficientsSchema,
  effects: z.array(DoseEffectSchema),
  creditDoseRange: z.object({
    min: z.number(),
    max: z.number(),
    threshold: z.number(),
    units: z.string().optional(),
  }),
  johnsonNeymanPoints: z.object({
    distress: z.record(z.string(), z.unknown()),
    engagement: z.record(z.string(), z.unknown()),
  }),
});

export type DoseEffectsData = z.infer<typeof DoseEffectsDataSchema>;

// =============================================================================
// Sample Descriptives Schema
// =============================================================================

export const DemographicGroupSchema = z.object({
  n: z.number().int().nonnegative(),
  pct: z.number().min(0).max(100),
});

export const SampleDescriptivesSchema = z.object({
  n: z.number().int().positive('Sample size must be positive'),
  demographics: z.object({
    race: z.record(z.string(), DemographicGroupSchema),
    firstgen: z.object({
      yes: DemographicGroupSchema,
      no: DemographicGroupSchema,
    }),
    pell: z.object({
      yes: DemographicGroupSchema,
      no: DemographicGroupSchema,
    }),
    fast: z.object({
      yes: DemographicGroupSchema,
      no: DemographicGroupSchema,
    }),
    sex: z.object({
      women: DemographicGroupSchema,
      men: DemographicGroupSchema,
    }),
    transferCredits: z.object({
      mean: z.number(),
      sd: z.number().nonnegative(),
      min: z.number(),
      max: z.number(),
      median: z.number(),
    }),
    living: z.record(z.string(), DemographicGroupSchema),
  }).passthrough(),
});

export type SampleDescriptives = z.infer<typeof SampleDescriptivesSchema>;

// =============================================================================
// Group Comparison Schema (for multi-group SEM)
// =============================================================================

export const GroupComparisonResultSchema = z.object({
  group: z.string(),
  pathId: z.string(),
  estimate: z.number().finite(),
  se: z.number().nonnegative(),
  ci: z.tuple([z.number().finite(), z.number().finite()]),
  pvalue: z.number().min(0).max(1),
});

export type GroupComparisonResult = z.infer<typeof GroupComparisonResultSchema>;

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Safe parse that returns typed result with error details
 */
export function safeParseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  dataName: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessages = result.error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  
  if (import.meta.env.DEV) {
    console.error(`Validation failed for ${dataName}:`, result.error.issues);
  }

  return {
    success: false,
    error: `Invalid ${dataName}: ${errorMessages}`,
  };
}

/**
 * Parse with fallback - logs warning but returns fallback on error
 */
export function parseWithFallback<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T,
  dataName: string
): T {
  const result = safeParseData(schema, data, dataName);
  
  if (result.success) {
    return result.data;
  }
  
  if (import.meta.env.DEV) {
    console.warn(`Using fallback data for ${dataName}. Error: ${result.error}`);
  }
  return fallback;
}
