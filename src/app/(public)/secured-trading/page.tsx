import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { SearchView } from "@/components/search/SearchView";
import { buildQuery, canonicalParams, isIndexable, parseSearchParams, runSearch } from "@/modules/search";

const FORCED = { tab: "secured" } as const;
const OMIT = ["tab", "cat"] as const;

const steps = [
  ["Place an order", "Agree price, quantity and terms with the supplier."],
  ["Pay into escrow", "Your payment is held safely, not sent to the supplier."],
  ["Supplier ships", "Production, optional inspection and shipping are tracked."],
  ["Confirm receipt", "Funds are released only after you confirm, or open a dispute."],
];

export async function generateMetadata({ searchParams }: PageProps<"/secured-trading">): Promise<Metadata> {
  const params = parseSearchParams(await searchParams, FORCED);
  const canon = buildQuery(canonicalParams({ ...params, cat: null }), OMIT);
  return {
    title: "Secured Trading - escrow-protected sourcing",
    description: "Buy from verified suppliers with escrow: your payment is held until you confirm the goods arrived as agreed.",
    alternates: { canonical: `/secured-trading${canon ? `?${canon}` : ""}` },
    robots: isIndexable(params) ? undefined : { index: false, follow: true },
  };
}

export default async function SecuredTradingPage({ searchParams }: PageProps<"/secured-trading">) {
  const params = parseSearchParams(await searchParams, FORCED);
  const outcome = await runSearch(params);
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
        <SearchView outcome={outcome} params={params} basePath="/secured-trading" omit={OMIT} tabs={["secured"]} />
      </section>
    </div>
  );
}
