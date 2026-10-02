import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHead({
  id,
  eyebrow,
  title,
  link,
  light = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  light?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className={`text-[13px] font-semibold uppercase tracking-[0.14em] ${light ? "text-accent" : "text-accent-ink"}`}>
          {eyebrow}
        </p>
        <h2 id={id} className="font-display mt-3 text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.02] font-medium">
          {title}
        </h2>
      </div>
      {link && (
        <Link
          href={link.href}
          className={`group inline-flex items-center gap-2 font-medium border-b pb-1 ${
            light ? "border-paper/40 hover:border-paper" : "border-ink/30 hover:border-ink"
          }`}
        >
          {link.label}
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
