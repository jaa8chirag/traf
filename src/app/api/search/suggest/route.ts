import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/modules/search";

/** Typeahead for the header search box. Public, short-cached. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const data = await suggest(q);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30" } });
}
