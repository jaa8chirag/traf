import type { NextConfig } from "next";

// Product/logo images are served straight from object storage (MinIO locally, CDN/S3 in production).
const cdn = process.env.NEXT_PUBLIC_CDN_URL || `${process.env.S3_ENDPOINT || "http://localhost:9000"}/${process.env.S3_BUCKET || "tarf-uploads"}`;
if (!cdn.startsWith("/") && !/^https?:\/\/[^/]+/.test(cdn)) {
  throw new Error(`NEXT_PUBLIC_CDN_URL must be an http(s) URL or a path starting with "/" (got "${cdn}"). On Windows Git Bash set it with MSYS_NO_PATHCONV=1.`);
}
// A relative base such as "/demo-media" means files are served by this app itself (demo hosting).
const origin = cdn.startsWith("/") ? null : new URL(cdn);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: origin
      ? [
          {
            protocol: origin.protocol === "https:" ? "https" : "http",
            hostname: origin.hostname,
            port: origin.port,
            pathname: `${origin.pathname.replace(/\/$/, "")}/**`,
          },
        ]
      : [],
    // The optimizer refuses private addresses (SSRF protection). Allow it only when the configured
    // image host itself is local (MinIO on localhost); real CDN/S3 hosts stay blocked from private IPs.
    dangerouslyAllowLocalIP: origin ? ["localhost", "127.0.0.1"].includes(origin.hostname) : false,
  },
};

export default nextConfig;
