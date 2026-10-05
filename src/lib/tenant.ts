// Showroom tenant resolution. Pure so it can be unit-tested; used by src/proxy.ts.
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "www", "app", "admin", "api", "cdn", "static", "mail", "support", "docs", "status",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Returns the showroom slug for `host` under `rootDomain`, or null when not a tenant host. */
export function resolveTenantSlug(host: string, rootDomain: string): string | null {
  const h = host.toLowerCase();
  const root = rootDomain.toLowerCase();
  if (h === root || !h.endsWith(`.${root}`)) return null;
  const label = h.slice(0, -(root.length + 1));
  if (label.includes(".") || RESERVED_SUBDOMAINS.has(label) || !SLUG_RE.test(label)) return null;
  return label;
}

export function isValidShowroomSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}
