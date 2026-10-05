import { NextResponse } from "next/server";
import { getSession } from "@/modules/identity";

/** Minimal, non-sensitive viewer info for the public header. Never cached. */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  const dashboard = !session
    ? null
    : session.access.staff
      ? "/admin/dashboard"
      : session.access.companies.length
        ? "/supplier/dashboard"
        : "/buyer/dashboard";
  return NextResponse.json({ dashboard }, { headers: { "Cache-Control": "private, no-store" } });
}
