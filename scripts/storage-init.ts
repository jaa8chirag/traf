// Ensures the bucket exists and `public/*` is world-readable (private/* stays private).
// Run: npm run storage:init
import "dotenv/config";
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET ?? "tarf-uploads";
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "ap-south-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "tarfminio",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "tarfminio123",
  },
});

async function main(): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/public/*`] },
        ],
      }),
    }),
  );
  console.log(`Bucket "${bucket}" ready; public/* is readable.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
