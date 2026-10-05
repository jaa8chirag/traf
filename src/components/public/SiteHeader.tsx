import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getMenuTree } from "@/modules/catalog";
import { AccountLinks } from "./AccountLinks";
import { CategoryMenu } from "./CategoryMenu";

const links = [
  { href: "/suppliers", label: "Suppliers" },
  { href: "/secured-trading", label: "Secured Trading" },
  { href: "/help", label: "Help" },
];

/**
 * Header. The category menu (CategoryMenu) renders every L1/L2 link in the HTML (crawlable)
 * and closes on outside click, Esc, link click or navigation. Search submits to /search?q=.
 */
export async function SiteHeader() {
  const menu = await getMenuTree();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" aria-label="Tarf home" className="shrink-0">
          <Logo />
        </Link>

        <CategoryMenu menu={menu} />

        <form action="/search" role="search" className="mx-auto hidden min-w-0 max-w-xl flex-1 md:flex">
          <label htmlFor="site-q" className="sr-only">Search products</label>
          <input id="site-q" name="q" type="search" placeholder="Search products or suppliers" className="h-10 min-w-0 flex-1 rounded-l-full border border-r-0 border-line bg-paper px-4 text-sm" />
          <button type="submit" className="h-10 rounded-r-full bg-ink px-5 text-sm font-medium text-paper hover:bg-ink-2">Search</button>
        </form>

        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hidden rounded-full px-3 py-2 hover:bg-paper-2 lg:inline-block">{l.label}</Link>
          ))}
          <AccountLinks />
        </nav>
      </div>
      <form action="/search" role="search" className="flex border-t border-line p-2 md:hidden">
        <label htmlFor="site-q-m" className="sr-only">Search products</label>
        <input id="site-q-m" name="q" type="search" placeholder="Search products" className="h-10 min-w-0 flex-1 rounded-l-full border border-r-0 border-line bg-paper px-4 text-sm" />
        <button type="submit" className="h-10 rounded-r-full bg-ink px-5 text-sm font-medium text-paper">Search</button>
      </form>
    </header>
  );
}
