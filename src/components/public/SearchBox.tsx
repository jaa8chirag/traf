"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

interface Suggestions {
  products: Array<{ title: string; slug: string }>;
  suppliers: Array<{ name: string; slug: string }>;
  categories: Array<{ name: string; path: string }>;
}

/** Header search with debounced typeahead. Works as a plain GET form to /search without JavaScript. */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Suggestions>) : null))
        .then((d) => {
          setData(d);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  // Stale suggestions are hidden (not cleared) once the query is too short.
  const shown = q.trim().length >= 2 ? data : null;
  const has = shown && (shown.products.length || shown.suppliers.length || shown.categories.length);
  const go = () => setOpen(false);

  return (
    <form ref={box} action="/search" role="search" className={`relative ${className}`} onSubmit={(e) => { e.preventDefault(); setOpen(false); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
      <div className="flex">
        <label htmlFor={id} className="sr-only">Search products or suppliers</label>
        <input id={id} name="q" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => shown && setOpen(true)}
          placeholder="Search products or suppliers" role="combobox" aria-expanded={open && Boolean(has)} aria-controls={`${id}-list`}
          className="h-10 min-w-0 flex-1 rounded-l-full border border-r-0 border-line bg-paper px-4 text-sm" />
        <button type="submit" className="h-10 rounded-r-full bg-ink px-5 text-sm font-medium text-paper hover:bg-ink-2">Search</button>
      </div>
      {open && shown && has && (
        <div id={`${id}-list`} className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
          {shown.categories.length > 0 && <Group title="Categories">{shown.categories.map((c) => <Item key={c.path} href={`/c/${c.path}`} onClick={go}>{c.name}</Item>)}</Group>}
          {shown.products.length > 0 && <Group title="Products">{shown.products.map((p) => <Item key={p.slug} href={`/p/${p.slug}`} onClick={go}>{p.title}</Item>)}</Group>}
          {shown.suppliers.length > 0 && <Group title="Suppliers">{shown.suppliers.map((s) => <Item key={s.slug} href={`/s/${s.slug}`} onClick={go}>{s.name}</Item>)}</Group>}
          <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={go} className="mt-1 block rounded-lg px-3 py-2 font-medium hover:bg-paper-2">See all results for “{q.trim()}”</Link>
        </div>
      )}
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function Item({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} onClick={onClick} className="block truncate rounded-lg px-3 py-2 hover:bg-paper-2">{children}</Link>
    </li>
  );
}
