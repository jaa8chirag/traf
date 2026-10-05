import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { EmptyState } from "@/components/ui";
import { listCmsPages } from "@/modules/cms";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Help centre",
  description: "Guides for buyers and suppliers: how to source, send inquiries, use Secured Trading and list products.",
  alternates: { canonical: "/help" },
};

export default async function HelpIndex() {
  const pages = await listCmsPages("HELP");
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Help centre", path: "/help" }]} />
      <h1 className="text-3xl font-semibold">Help centre</h1>
      {pages.length === 0 ? <EmptyState title="Articles coming soon" /> : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {pages.map((p) => (
            <li key={p.slug} className="p-4">
              <Link href={`/help/${p.slug}`} className="font-medium hover:underline">{p.title}</Link>
              {p.seoDesc && <p className="mt-1 text-sm text-muted">{p.seoDesc}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
