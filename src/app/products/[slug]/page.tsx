import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products, getProduct } from "@/data/catalog";
import { details } from "@/data/extra";
import { Breadcrumb } from "@/components/PageHero";
import { ProductView } from "@/components/ProductView";
import { ProductCard } from "@/components/ProductCard";
import { Reviews } from "@/components/Reviews";
import { FAQ } from "@/components/FAQ";

export const dynamicParams = false;
export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: `${p.name} — Tarf`, description: details[slug]?.desc } : {};
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const p = getProduct(slug);
  const d = details[slug];
  if (!p || !d) notFound();
  const related = products.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <div className="container-x pt-6 pb-10 lg:pb-16">
        <Breadcrumb items={[{ label: "Shop", href: "/shop" }, { label: p.category, href: "/shop/tech-workspace" }, { label: p.name }]} />
        <div className="mt-6">
          <ProductView p={p} d={d} />
        </div>
      </div>
      <div id="reviews" className="scroll-mt-20"><Reviews /></div>
      <section className="container-x py-16 lg:py-24 pb-28 lg:pb-24">
        <h2 className="font-display text-4xl sm:text-5xl">You may also like</h2>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-10">
          {related.map((r) => <ProductCard key={r.slug} p={r} />)}
        </div>
      </section>
      <FAQ />
    </>
  );
}
