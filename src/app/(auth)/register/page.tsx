import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/modules/identity";
import { t } from "@/lib/i18n/t";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const intent = sp.as === "supplier" ? "supplier" : "buyer";
  const google = googleEnabled() ? `/api/auth/google?intent=${intent}` : undefined;
  const tab = (active: boolean) =>
    cn("flex-1 rounded-full px-4 py-2 text-center text-sm font-medium", active ? "bg-ink text-paper" : "hover:bg-paper-2");
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("auth.register.title")}</h1>
      <nav aria-label="Account type" className="mt-6 flex gap-1 rounded-full border border-line bg-white p-1">
        <Link href="/register?as=buyer" className={tab(intent === "buyer")} aria-current={intent === "buyer" ? "page" : undefined}>
          {t("auth.as.buyer")}
        </Link>
        <Link href="/register?as=supplier" className={tab(intent === "supplier")} aria-current={intent === "supplier" ? "page" : undefined}>
          {t("auth.as.supplier")}
        </Link>
      </nav>
      <div className="mt-6">
        <AuthForm key={intent} purpose="login" intent={intent} googleHref={google} />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-ink underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
