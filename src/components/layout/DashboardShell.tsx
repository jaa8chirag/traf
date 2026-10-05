import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n/t";

export interface NavItem {
  label: string;
  href: string;
}

/** Shared chrome for buyer / supplier / admin consoles: top bar + sidebar (stacked on mobile). */
export function DashboardShell({
  panel,
  nav,
  userLabel,
  children,
}: {
  panel: string;
  nav: NavItem[];
  userLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Tarf home">
              <Logo />
            </Link>
            <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-medium text-muted">{panel}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{userLabel}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm">
                {t("nav.signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label={`${panel} navigation`} className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-xl px-3 py-2 text-sm hover:bg-paper-2">
              {item.label}
            </Link>
          ))}
        </nav>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
