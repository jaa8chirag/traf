import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { RichText } from "@/components/cms/RichText";
import { getCmsPage } from "@/modules/cms";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const page = await getCmsPage("LEGAL", (await params).slug);
  if (!page) return { title: "Not found", robots: { index: false } };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDesc ?? undefined,
    alternates: { canonical: `/legal/${page.slug}` },
  };
}

export default async function CmsDocument({ params }: PageProps<"/legal/[slug]">) {
  const page = await getCmsPage("LEGAL", (await params).slug);
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: page.title, path: `/legal/${page.slug}` }]} />
      <h1 className="text-3xl font-semibold">{page.title}</h1>
      <RichText body={page.body} />
    </article>
  );
}
