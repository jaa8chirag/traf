import { NextResponse, type NextRequest } from "next/server";
import { listChildCategories } from "@/modules/catalog";

/** Public: children of a category (or the L1 roots when `parent` is absent). Used by the category picker. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const parent = request.nextUrl.searchParams.get("parent");
  if (parent !== null && !/^[a-z0-9]{10,40}$/i.test(parent)) {
    return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }
  const items = await listChildCategories(parent);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
