import type { NextConfig } from "next";

// Product/logo images are served straight from object storage (MinIO locally, CDN/S3 in production).
const origin = new URL(
  process.env.NEXT_PUBLIC_CDN_URL || `${process.env.S3_ENDPOINT || "http://localhost:9000"}/${process.env.S3_BUCKET || "tarf-uploads"}`,
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: origin.protocol === "https:" ? "https" : "http",
        hostname: origin.hostname,
        port: origin.port,
        pathname: `${origin.pathname.replace(/\/$/, "")}/**`,
      },
    ],
    // Local MinIO resolves to a private address, which the optimizer blocks by default.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
