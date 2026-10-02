import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/" className="hover:text-ink">Home</Link></li>
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-1.5">
            <ChevronRight size={14} aria-hidden />
            {i.href ? <Link href={i.href} className="hover:text-ink">{i.label}</Link> : <span className="text-ink" aria-current="page">{i.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  crumbs = [],
  children,
  bg = "bg-paper-2",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
  bg?: string;
}) {
  return (
    <section className={`${bg} border-b border-line`}>
      <div className="container-x py-10 lg:py-16">
        {crumbs.length > 0 && <Breadcrumb items={crumbs} />}
        {eyebrow && <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent-ink">{eyebrow}</p>}
        <h1 className="font-display mt-3 text-5xl sm:text-6xl lg:text-7xl leading-[1] font-medium max-w-4xl">{title}</h1>
        {lede && <p className="mt-5 text-lg lg:text-xl text-muted max-w-2xl leading-relaxed">{lede}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Button({
  href,
  children,
  variant = "dark",
}: {
  href: string;
  children: ReactNode;
  variant?: "dark" | "accent" | "ghost";
}) {
  const v = {
    dark: "bg-ink text-paper hover:bg-accent",
    accent: "bg-accent text-white hover:bg-ink",
    ghost: "border border-ink/20 hover:bg-white",
  }[variant];
  return (
    <Link href={href} className={`inline-flex items-center gap-2 h-13 px-7 py-3.5 rounded-full font-medium transition-colors ${v}`}>
      {children}
    </Link>
  );
}
