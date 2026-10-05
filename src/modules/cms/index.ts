import "server-only";
import type { BannerPlacement, CmsPageType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Published CMS page, or null. Locale falls back to English. */
export async function getCmsPage(type: CmsPageType, slug: string, locale = "en") {
  const page = await prisma.cmsPage.findFirst({
    where: { type, slug, published: true, locale: { in: locale === "en" ? ["en"] : [locale, "en"] } },
    orderBy: { locale: locale === "en" ? "asc" : "desc" },
  });
  return page;
}

export async function listCmsPages(type: CmsPageType, locale = "en") {
  return prisma.cmsPage.findMany({
    where: { type, published: true, locale },
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    select: { slug: true, title: true, seoDesc: true, publishedAt: true },
  });
}

export async function listAllPublishedCmsPages() {
  return prisma.cmsPage.findMany({ where: { published: true, locale: "en" }, select: { type: true, slug: true, updatedAt: true } });
}

/** Active, in-schedule banners for a placement. */
export async function listBanners(placement: BannerPlacement) {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      placement,
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });
}
