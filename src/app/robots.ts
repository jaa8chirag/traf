import type { MetadataRoute } from "next";
import { sitemapShards } from "@/modules/catalog";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Sharded sitemaps have no index file, so every shard is listed explicitly.
  const { total } = await sitemapShards();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/buyer/", "/supplier/", "/admin/", "/api/", "/checkout/", "/orders/", "/search", "/login", "/register"] }],
    sitemap: Array.from({ length: total }, (_, i) => absoluteUrl(`/sitemap/${i}.xml`)),
  };
}
