import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireBuyer } from "@/modules/identity";

const nav = [
  { label: "Dashboard", href: "/buyer/dashboard" },
  { label: "Messages", href: "/buyer/messages" },
  { label: "Sourcing requests", href: "/buyer/sourcing" },
  { label: "Orders", href: "/buyer/orders" },
  { label: "Samples", href: "/buyer/samples" },
  { label: "Inquiry basket", href: "/buyer/basket" },
  { label: "Favorites", href: "/buyer/favorites" },
  { label: "History", href: "/buyer/history" },
  { label: "Alerts", href: "/buyer/alerts" },
  { label: "Settings", href: "/buyer/settings" },
];

export default async function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  const session = await requireBuyer();
  return (
    <DashboardShell panel="Buyer" nav={nav} userLabel={session.user.email}>
      {children}
    </DashboardShell>
  );
}
