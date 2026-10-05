import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireSupplier } from "@/modules/identity";

const nav = [
  { label: "Dashboard", href: "/supplier/dashboard" },
  { label: "Messages", href: "/supplier/messages" },
  { label: "Company info", href: "/supplier/company" },
  { label: "Products", href: "/supplier/products" },
  { label: "Showroom", href: "/supplier/showroom" },
  { label: "Sourcing requests", href: "/supplier/sourcing" },
  { label: "Orders", href: "/supplier/orders" },
  { label: "Membership", href: "/supplier/membership" },
  { label: "Verification", href: "/supplier/verification" },
  { label: "Analytics", href: "/supplier/analytics" },
  { label: "Reviews", href: "/supplier/reviews" },
  { label: "Team", href: "/supplier/team" },
];

export default async function SupplierLayout({ children }: LayoutProps<"/supplier">) {
  const { session, company } = await requireSupplier();
  return (
    <DashboardShell panel={`Supplier · ${company.companyName}`} nav={nav} userLabel={session.user.email}>
      {children}
    </DashboardShell>
  );
}
