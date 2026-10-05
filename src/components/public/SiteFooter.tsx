import Link from "next/link";
import { Logo } from "@/components/Logo";

const cols: Array<{ title: string; links: Array<[string, string]> }> = [
  { title: "Buyers", links: [["Browse categories", "/categories"], ["Find suppliers", "/suppliers"], ["Secured Trading", "/secured-trading"], ["How to buy", "/help/how-to-buy"], ["A–Z index", "/a-z"]] },
  { title: "Suppliers", links: [["Sell on Tarf", "/register?as=supplier"], ["How to sell", "/help/how-to-sell"], ["Sign in", "/login"]] },
  { title: "Company", links: [["Help centre", "/help"], ["Blog", "/blog"], ["Terms of use", "/legal/terms"], ["Privacy policy", "/legal/privacy"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">Source directly from verified manufacturers, with optional escrow-protected payments.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-ink hover:underline">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} Tarf. All rights reserved.</div>
    </footer>
  );
}
