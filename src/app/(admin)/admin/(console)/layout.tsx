import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireStaff } from "@/modules/identity";

const nav = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Members", href: "/admin/members" },
  { label: "Suppliers", href: "/admin/suppliers" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Products", href: "/admin/products" },
  { label: "Sourcing requests", href: "/admin/sourcing" },
  { label: "Orders & escrow", href: "/admin/orders" },
  { label: "Disputes", href: "/admin/disputes" },
  { label: "Plans & billing", href: "/admin/plans" },
  { label: "Ranking", href: "/admin/ranking" },
  { label: "CMS", href: "/admin/cms" },
  { label: "Support", href: "/admin/support" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Staff & roles", href: "/admin/staff" },
];

export default async function AdminConsoleLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireStaff();
  return (
    <DashboardShell panel={`Admin · ${session.access.staff?.roleKey ?? ""}`} nav={nav} userLabel={session.user.email}>
      {children}
    </DashboardShell>
  );
}
