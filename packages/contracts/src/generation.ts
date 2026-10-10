export type Modality = 'text' | 'image' | 'video' | 'audio' | 'previs';

export interface AssetRef {
  assetVersionId: string;
  sha256: string;
  role: string;
}

export interface GenerationSpec {
  schemaVersion: '1.0';
  shotId: string;
  promptRevisionId: string;
  modality: Modality;
  inputs: AssetRef[];
  intent: { prompt: string; negativePrompt?: string };
  output: {
    mimeType: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    fps?: number;
  };
  seed?: number;
  adapterOptions: Record<string, unknown>;
}

export interface ExecutionPlan {
  planHash: string;
  adapterId: string;
  adapterVersion: string;
  requirements: { minVramMb?: number; diskMb?: number; concurrencyKey?: string };
  resolvedParameters: Record<string, unknown>;
}

export interface OutputManifest {
  schemaVersion: '1.0';
  jobId: string;
  attemptId: string;
  planHash: string;
  outputs: Array<{ logicalName: string; mimeType: string; byteSize: number; sha256: string; stagingHandle: string }>;
  provenance: Record<string, unknown>;
}
