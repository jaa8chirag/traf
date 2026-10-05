export interface PresignUploadInput {
  key: string;
  contentType: string;
  maxBytes: number;
}

export interface StorageProvider {
  presignUpload(input: PresignUploadInput): Promise<{ url: string; headers: Record<string, string> }>;
  publicUrl(key: string): string;
  /** For private documents (licences, audit reports). */
  signedGetUrl(key: string, ttlSec: number): Promise<string>;
  delete(key: string): Promise<void>;
}
