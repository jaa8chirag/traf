import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/modules/identity";
import { safeNext } from "@/lib/safe-next";
import { t } from "@/lib/i18n/t";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null) ?? undefined;
  const google = googleEnabled() ? `/api/auth/google?intent=buyer${next ? `&next=${encodeURIComponent(next)}` : ""}` : undefined;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("auth.login.title")}</h1>
      <div className="mt-6">
        <AuthForm purpose="login" intent="buyer" next={next} googleHref={google} />
      </div>
      <p className="mt-6 text-sm text-muted">
        New to Tarf?{" "}
        <Link href="/register" className="font-medium text-ink underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
