import "server-only";
import type { StorageProvider } from "./types";
import { S3StorageProvider } from "./s3";

let instance: StorageProvider | undefined;

export function storage(): StorageProvider {
  instance ??= new S3StorageProvider();
  return instance;
}
export type { StorageProvider, PresignUploadInput } from "./types";
