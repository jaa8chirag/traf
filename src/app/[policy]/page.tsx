import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { policies } from "@/data/extra";
import { PageHero } from "@/components/PageHero";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(policies).map((policy) => ({ policy }));

export async function generateMetadata({ params }: PageProps<"/[policy]">): Promise<Metadata> {
  const { policy } = await params;
  const p = policies[policy];
  return p ? { title: `${p.title} — Tarf` } : {};
}

export default async function PolicyPage({ params }: PageProps<"/[policy]">) {
  const { policy } = await params;
  const p = policies[policy];
  if (!p) notFound();

  return (
    <>
      <PageHero eyebrow="Legal" title={p.title} lede={`Last updated ${p.updated}`} crumbs={[{ label: "Help", href: "/help" }, { label: p.title }]} />
      <div className="container-x py-14 grid lg:grid-cols-[240px_1fr] gap-12">
        <aside className="hidden lg:block self-start sticky top-24" aria-label="Contents">
          <p className="text-sm font-semibold mb-3">On this page</p>
          <ul className="space-y-2 text-sm text-muted">
            {p.sections.map((s, i) => <li key={s.h}><a href={`#s${i}`} className="hover:text-ink">{s.h}</a></li>)}
          </ul>
          <p className="text-sm font-semibold mt-8 mb-3">Related</p>
          <ul className="space-y-2 text-sm text-muted">
            {Object.entries(policies).filter(([k]) => k !== policy).map(([k, v]) => <li key={k}><Link href={`/${k}`} className="hover:text-ink">{v.title}</Link></li>)}
          </ul>
        </aside>
        <article className="max-w-2xl">
          {p.sections.map((s, i) => (
            <section key={s.h} id={`s${i}`} className="mb-10 scroll-mt-24">
              <h2 className="font-display text-3xl">{s.h}</h2>
              <p className="mt-3 text-lg text-ink/80 leading-relaxed">{s.p}</p>
            </section>
          ))}
          <p className="text-sm text-muted border-t border-line pt-6">Draft placeholder text: have this reviewed by legal counsel before launch. Questions? <Link href="/contact" className="underline text-ink">Contact us</Link>.</p>
          <div className="mt-6 flex gap-3"><Link href="/help" className="underline underline-offset-4">Return to Help</Link><Link href="/shop" className="underline underline-offset-4">Shop</Link></div>
        </article>
      </div>
    </>
  );
}
