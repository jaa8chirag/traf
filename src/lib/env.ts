import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("ap-south-1"),
  S3_BUCKET: z.string().default("tarf-uploads"),
  S3_ACCESS_KEY_ID: z.string().default("tarfminio"),
  S3_SECRET_ACCESS_KEY: z.string().default("tarfminio123"),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_CDN_URL: z.string().optional(),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(25),
  EMAIL_FROM: z.string().default("Tarf <no-reply@tarf.example>"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Server-only env, validated on first use so `next build` does not need secrets. */
export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
