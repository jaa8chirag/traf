import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { EmptyState } from "@/components/ui";
import { listCmsPages } from "@/modules/cms";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Sourcing guides & news",
  description: "Practical guides on sourcing, supplier verification and international trade.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await listCmsPages("BLOG");
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]} />
      <h1 className="text-3xl font-semibold">Sourcing guides &amp; news</h1>
      {posts.length === 0 ? <EmptyState title="No posts yet" /> : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.slug} className="rounded-2xl border border-line bg-white p-5">
              <Link href={`/blog/${p.slug}`} className="text-lg font-medium hover:underline">{p.title}</Link>
              {p.seoDesc && <p className="mt-1 text-sm text-muted">{p.seoDesc}</p>}
              {p.publishedAt && <p className="mt-2 text-xs text-muted">{p.publishedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
