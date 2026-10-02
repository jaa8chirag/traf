import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  { title: "Shop", links: [["All products", "/shop"], ["Collections", "/collections/workspace"], ["Offers", "/offers"], ["Search", "/search"]] },
  { title: "Support", links: [["Help centre", "/help"], ["Track order", "/track-order"], ["Contact", "/contact"], ["Shipping", "/shipping-policy"]] },
  { title: "Tarf", links: [["About", "/about"], ["Why Tarf", "/why-my-ventures"], ["Quality & trust", "/quality"], ["Reviews", "/reviews"]] },
  { title: "Policies", links: [["Privacy", "/privacy-policy"], ["Terms", "/terms"], ["Refunds", "/refund-policy"], ["Cookies", "/cookie-policy"]] },
];

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="container-x pt-16 pb-8">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <Logo light />
            <p className="font-display text-3xl mt-6 leading-tight max-w-xs">
              Smart products for <em className="text-accent">better</em> everyday living.
            </p>
          </div>
          <nav aria-label="Footer" className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <h3 className="text-[13px] uppercase tracking-[0.14em] text-paper/50">{c.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([l, h]) => (
                    <li key={h}>
                      <Link href={h} className="text-paper/85 hover:text-accent transition-colors">{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 pt-6 border-t border-paper/10 flex flex-wrap items-center justify-between gap-4 text-sm text-paper/55">
          <p>© {new Date().getFullYear()} Tarf Ventures. All rights reserved.</p>
          <p className="flex items-center gap-3">
            Secure payments · UPI · Cards · Net banking
          </p>
        </div>
      </div>
      <div aria-hidden className="font-display text-[26vw] leading-[0.7] text-paper/[0.04] text-center select-none overflow-hidden pt-6 -mb-[2vw]">
        tarf
      </div>
    </footer>
  );
}
