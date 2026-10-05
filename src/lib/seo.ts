/** Canonical site origin (no trailing slash). */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const absoluteUrl = (path: string): string => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

// "<" becomes backslash + "u003c" (still valid JSON), so data can never close the <script> tag.
const LT_ESCAPE = `${String.fromCharCode(92)}u003c`;

/** Serialise JSON-LD safely for an inline <script>. */
export const jsonLdString = (data: unknown): string => JSON.stringify(data).replaceAll("<", LT_ESCAPE);

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
