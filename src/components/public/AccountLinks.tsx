"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui";

interface Me {
  dashboard: string | null;
}

/** Fetches the viewer after hydration so public pages stay cacheable (no cookies read during render). */
export function AccountLinks() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then((m) => live && setMe(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (me?.dashboard) {
    return <Link href={me.dashboard} className={buttonClass("secondary", "sm")}>My account</Link>;
  }
  return (
    <>
      <Link href="/login" className={buttonClass("ghost", "sm")}>Sign in</Link>
      <Link href="/register?as=supplier" className={buttonClass("secondary", "sm", "hidden sm:inline-flex")}>Sell on Tarf</Link>
      <Link href="/register" className={buttonClass("primary", "sm")}>Join free</Link>
    </>
  );
}
