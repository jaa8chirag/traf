/**
 * Public origin of this deployment (no trailing slash). Order: explicit NEXT_PUBLIC_APP_URL, then the
 * Vercel system URL (production domain on production, per-deployment URL on previews), then localhost.
 */
export function defaultAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
