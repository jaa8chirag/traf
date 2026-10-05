import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";

// Placeholder public shell; the category mega-menu, search and banners arrive in CP-3.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" aria-label="Tarf home">
            <Logo />
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register?as=supplier" variant="secondary" size="sm">
              Sell on Tarf
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              Join free
            </ButtonLink>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-white py-8 text-sm text-muted">
        <div className="mx-auto max-w-7xl px-4">© {new Date().getFullYear()} Tarf</div>
      </footer>
    </>
  );
}
