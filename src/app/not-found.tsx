import Link from "next/link";
import { categories } from "@/data/catalog";

export default function NotFound() {
  return (
    <section className="container-x py-24 lg:py-32 text-center">
      <p className="font-display text-[10rem] sm:text-[14rem] leading-none text-accent/90">404</p>
      <h1 className="font-display text-4xl sm:text-5xl -mt-4">This page wandered off.</h1>
      <p className="text-muted mt-3">The link may be broken or the page may have moved.</p>
      <form action="/search" role="search" className="mt-8 mx-auto max-w-md flex gap-2 bg-white border border-line rounded-full p-1.5 pl-5">
        <input name="q" placeholder="Search products" aria-label="Search products" className="flex-1 bg-transparent outline-none" />
        <button className="h-11 px-5 rounded-full bg-ink text-paper font-medium">Search</button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {categories.filter((c) => c.live).map((c) => <Link key={c.slug} href={`/shop/${c.slug}`} className="h-10 px-4 inline-flex items-center rounded-full border border-line bg-white text-sm hover:border-ink">{c.name}</Link>)}
      </div>
      <Link href="/shop" className="mt-8 inline-flex h-14 px-8 items-center rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors">Back to shopping</Link>
    </section>
  );
}
