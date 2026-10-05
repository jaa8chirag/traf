import type { MetadataRoute } from "next";
import { sitemapCategories, sitemapProducts, sitemapShards, sitemapSuppliers } from "@/modules/catalog";
import { listAllPublishedCmsPages } from "@/modules/cms";
import { absoluteUrl } from "@/lib/seo";

// Sharded sitemap (Google limit: 50k URLs/file). id 0 = site pages + categories + CMS;
// then product shards and supplier shards.
export const revalidate = 3600;

export async function generateSitemaps() {
  const { total } = await sitemapShards();
  return Array.from({ length: total }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const { productShards } = await sitemapShards();

  if (id === 0) {
    const [cats, cms] = await Promise.all([sitemapCategories(), listAllPublishedCmsPages()]);
    const base = ["/", "/categories", "/suppliers", "/secured-trading", "/a-z", "/help", "/blog"].map((p) => ({ url: absoluteUrl(p), changeFrequency: "daily" as const, priority: p === "/" ? 1 : 0.7 }));
    const letters = ["0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => ({ url: absoluteUrl(`/a-z/${l}`), changeFrequency: "weekly" as const, priority: 0.3 }));
    const categories = cats.map((c) => ({ url: absoluteUrl(`/c/${c.path}`), changeFrequency: "daily" as const, priority: 0.8 }));
    const pages = cms.map((p) => ({ url: absoluteUrl(`/${p.type.toLowerCase()}/${p.slug}`), lastModified: p.updatedAt, priority: 0.4 }));
    return [...base, ...letters, ...categories, ...pages];
  }
  if (id <= productShards) {
    return (await sitemapProducts(id - 1)).map((p) => ({ url: absoluteUrl(`/p/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 }));
  }
  return (await sitemapSuppliers(id - 1 - productShards)).map((s) => ({ url: absoluteUrl(`/s/${s.slug}`), lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 }));
}
