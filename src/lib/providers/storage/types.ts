export interface PresignUploadInput {
  key: string;
  contentType: string;
  /** Exact size; it is signed into the URL so the upload cannot exceed what was validated. */
  sizeBytes: number;
}

export interface StorageProvider {
  presignUpload(input: PresignUploadInput): Promise<{ url: string; headers: Record<string, string> }>;
  publicUrl(key: string): string;
  /** For private documents (licences, audit reports). */
  signedGetUrl(key: string, ttlSec: number): Promise<string>;
  /** True when the object exists (used to verify a client-side upload actually happened). */
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
