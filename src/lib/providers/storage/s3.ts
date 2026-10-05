import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { PresignUploadInput, StorageProvider } from "./types";

/** S3-compatible storage (MinIO locally, S3/Azure-compatible gateway in production). */
export class S3StorageProvider implements StorageProvider {
  private client = new S3Client({
    endpoint: env().S3_ENDPOINT,
    region: env().S3_REGION,
    forcePathStyle: env().S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: env().S3_ACCESS_KEY_ID, secretAccessKey: env().S3_SECRET_ACCESS_KEY },
  });
  private bucket = env().S3_BUCKET;

  async presignUpload({ key, contentType, sizeBytes }: PresignUploadInput) {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: sizeBytes }),
      { expiresIn: 300 },
    );
    return { url, headers: { "Content-Type": contentType } };
  }

  publicUrl(key: string): string {
    const base = env().NEXT_PUBLIC_CDN_URL ?? `${env().S3_ENDPOINT}/${this.bucket}`;
    return `${base.replace(/\/$/, "")}/${key}`;
  }

  signedGetUrl(key: string, ttlSec: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSec });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
