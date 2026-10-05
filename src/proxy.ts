import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantSlug } from "@/lib/tenant";

// Cookie name duplicated from modules/identity/session.ts: proxy must not import
// server-only/DB code. This is an OPTIMISTIC check only; real authorization is in
// the service layer (see docs/ARCHITECTURE.md §6).
const SESSION_COOKIE = "tarf_session";

const PROTECTED_PREFIXES = ["/buyer", "/supplier", "/orders", "/checkout"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // 1. Showroom tenant: {slug}.<root> -> /s/{slug}/...
  if (process.env.SHOWROOM_SUBDOMAINS_ENABLED === "true" && process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    const slug = resolveTenantSlug(request.headers.get("host") ?? "", process.env.NEXT_PUBLIC_ROOT_DOMAIN);
    if (slug && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
      const headers = new Headers(request.headers);
      headers.set("x-tenant-slug", slug);
      return NextResponse.rewrite(url, { request: { headers } });
    }
  }

  // 2. Optimistic auth redirect.
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)"],
};
