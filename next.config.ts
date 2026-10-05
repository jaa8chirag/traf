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
    // The optimizer refuses private addresses (SSRF protection). Allow it only when the configured
    // image host itself is local (MinIO on localhost); real CDN/S3 hosts stay blocked from private IPs.
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1"].includes(origin.hostname),
  },
};

export default nextConfig;
