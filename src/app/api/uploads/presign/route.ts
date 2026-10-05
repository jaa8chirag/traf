import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/providers/storage";
import { getSession } from "@/modules/identity";
import { createUploadTicket } from "@/modules/supplier";

const bodySchema = z.object({
  purpose: z.enum(["company-document", "company-logo", "product-media"]),
  contentType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Defence in depth on top of SameSite=Lax cookies: reject cross-origin form/XHR posts.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  const session = await getSession();
  const company = session?.access.companies[0];
  if (!session || !company) return NextResponse.json({ error: "Not signed in as a supplier" }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const ticket = await createUploadTicket(session, { ...body.data, companyId: company.companyId });
  if (!ticket.ok) return NextResponse.json({ error: ticket.error }, { status: 400 });

  const isPublic = ticket.value.key.startsWith("public/");
  return NextResponse.json({
    key: ticket.value.key,
    url: ticket.value.url,
    headers: ticket.value.headers,
    publicUrl: isPublic ? storage().publicUrl(ticket.value.key) : null,
  });
}
