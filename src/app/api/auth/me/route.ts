import { NextResponse } from "next/server";
import { getSession, homeFor } from "@/modules/identity";

/** Minimal, non-sensitive viewer info for the public header. Never cached. */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  const dashboard = session ? homeFor(session.access) : null;
  return NextResponse.json({ dashboard }, { headers: { "Cache-Control": "private, no-store" } });
}
