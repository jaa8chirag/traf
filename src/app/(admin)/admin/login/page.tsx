import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getSession } from "@/modules/identity";
import { t } from "@/lib/i18n/t";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.access.staff) redirect("/admin/dashboard");
  return (
    <div className="mx-auto w-full max-w-md px-4 py-24">
      <h1 className="text-2xl font-semibold">{t("admin.login.title")}</h1>
      <p className="mt-1 text-sm text-muted">Staff access only. Activity is logged.</p>
      <div className="mt-6">
        <AuthForm purpose="admin_login" intent="buyer" />
      </div>
    </div>
  );
}
