import Link from "next/link";
import { cn } from "@/lib/cn";

/** Server-rendered pagination. `hrefFor(page)` builds the URL so filters stay in the query string. */
export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(item, "hover:bg-paper-2")}>
          Previous
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-ink text-paper" : "hover:bg-paper-2")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount && (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(item, "hover:bg-paper-2")}>
          Next
        </Link>
      )}
    </nav>
  );
}
