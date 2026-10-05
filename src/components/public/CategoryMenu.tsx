"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { MenuCategory } from "@/modules/catalog";

/**
 * Category mega-menu. Still a <details> so every link is in the server-rendered HTML,
 * but it now closes on: outside click, Esc, any link click, route change, or the Close button.
 */
export function CategoryMenu({ menu }: { menu: MenuCategory[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  const close = () => ref.current?.removeAttribute("open");

  // Close after navigating (e.g. via browser back/forward or a link in the panel).
  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.open && e.target instanceof Node && !ref.current.contains(e.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-paper-2">
        <span aria-hidden>☰</span> <span className="hidden sm:inline">Categories</span>
      </summary>
      <div className="fixed inset-x-0 top-16 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-line bg-white shadow-xl" onClick={(e) => e.target instanceof HTMLElement && e.target.closest("a") && close()}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-4">
          <p className="text-sm font-semibold">All categories</p>
          <button type="button" onClick={close} className="rounded-full border border-line px-3 py-1 text-sm hover:bg-paper-2">
            ✕ Close
          </button>
        </div>
        <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {menu.map((c) => (
            <div key={c.id}>
              <Link href={`/c/${c.path}`} className="text-sm font-semibold hover:underline">{c.name}</Link>
              <ul className="mt-1.5 space-y-1 text-sm text-muted">
                {c.children.slice(0, 5).map((s) => (
                  <li key={s.id}><Link href={`/c/${s.path}`} className="hover:text-ink hover:underline">{s.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line bg-paper py-3 text-center text-sm">
          <Link href="/categories" className="font-medium underline">View all categories</Link>
          <span className="mx-3 text-muted">·</span>
          <Link href="/a-z" className="font-medium underline">A–Z index</Link>
        </div>
      </div>
    </details>
  );
}
