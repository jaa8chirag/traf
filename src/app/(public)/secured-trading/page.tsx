import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { ProductCard } from "@/components/public/Cards";
import { EmptyState, Pagination } from "@/components/ui";
import { listProducts } from "@/modules/catalog";

export const revalidate = 300;

const pageParam = (v: string | string[] | undefined): number => Math.max(1, Math.floor(Number(typeof v === "string" ? v : 1)) || 1);

export const metadata: Metadata = {
  title: "Secured Trading - escrow-protected sourcing",
  description: "Buy from verified suppliers with escrow: your payment is held until you confirm the goods arrived as agreed.",
  alternates: { canonical: "/secured-trading" },
};

const steps = [
  ["Place an order", "Agree price, quantity and terms with the supplier."],
  ["Pay into escrow", "Your payment is held safely, not sent to the supplier."],
  ["Supplier ships", "Production, optional inspection and shipping are tracked."],
  ["Confirm receipt", "Funds are released only after you confirm, or open a dispute."],
];

export default async function SecuredTradingPage({ searchParams }: PageProps<"/secured-trading">) {
  const page = pageParam((await searchParams).page);
  const result = await listProducts({ escrowOnly: true, page });
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Secured Trading", path: "/secured-trading" }]} />
      <header className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold">Secured Trading</h1>
        <p className="text-muted">Order with confidence. Every Secured Trading order is protected by escrow and Tarf dispute resolution.</p>
      </header>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="rounded-2xl border border-line bg-white p-5">
            <span className="text-sm font-semibold text-accent-ink">Step {i + 1}</span>
            <h2 className="mt-1 font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ol>
      <section aria-labelledby="eligible" className="space-y-4">
        <h2 id="eligible" className="text-xl font-semibold">Products available with Secured Trading</h2>
        {result.items.length === 0 ? (
          <EmptyState title="No Secured Trading products yet" />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{result.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
        <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/secured-trading${n > 1 ? `?page=${n}` : ""}`} />
      </section>
    </div>
  );
}
