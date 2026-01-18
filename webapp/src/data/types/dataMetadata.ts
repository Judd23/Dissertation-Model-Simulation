export interface DataMetadata {
  generatedAt?: string;
  generatedAtShort?: string;
  pipelineRunId?: string;
  inputFiles?: Array<{
    path?: string;
    exists?: boolean;
    modifiedAt?: string | null;
  }>;
  [key: string]: unknown;
}
