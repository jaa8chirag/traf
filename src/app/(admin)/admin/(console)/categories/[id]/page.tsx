import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteAttributeAction } from "@/app/(admin)/admin/actions";
import { AttributeForm } from "@/components/admin/AttributeForm";
import { Badge, Button, Table, Td, Th } from "@/components/ui";
import { getCategoryChain, getEffectiveAttributes, getOwnAttributes } from "@/modules/catalog";
import { requireStaff } from "@/modules/identity";

export const metadata: Metadata = { title: "Category attributes", robots: { index: false, follow: false } };

export default async function CategoryAttributesPage({ params }: PageProps<"/admin/categories/[id]">) {
  const { id } = await params;
  await requireStaff("category.manage");
  const chain = await getCategoryChain(id);
  if (!chain.length) notFound();
  const [own, effective] = await Promise.all([getOwnAttributes(id), getEffectiveAttributes(id)]);
  const ownKeys = new Set(own.map((a) => a.key));
  const inherited = effective.filter((a) => !ownKeys.has(a.key));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attributes</h1>
        <p className="text-sm text-muted">{chain.map((c) => c.name).join(" › ")}</p>
        <p className="mt-1 text-xs text-muted">Attributes apply to this category and everything beneath it. A child can override an inherited key.</p>
      </div>
      <Table>
        <thead><tr><Th>Key</Th><Th>Label</Th><Th>Type</Th><Th>Flags</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
        <tbody>
          {own.map((a) => (
            <tr key={a.id}>
              <Td className="font-mono text-xs">{a.key}</Td>
              <Td>{a.label}{a.unit ? ` (${a.unit})` : ""}</Td>
              <Td>{a.type.replace("_", " ").toLowerCase()}</Td>
              <Td className="space-x-1">{a.isRequired && <Badge tone="warning">required</Badge>}{a.isFilterable && <Badge tone="info">filter</Badge>}</Td>
              <Td>
                <form action={deleteAttributeAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="categoryId" value={id} />
                  <Button type="submit" variant="ghost" size="sm">Delete</Button>
                </form>
              </Td>
            </tr>
          ))}
          {inherited.map((a) => (
            <tr key={a.id} className="text-muted">
              <Td className="font-mono text-xs">{a.key}</Td><Td>{a.label}</Td><Td>{a.type.replace("_", " ").toLowerCase()}</Td><Td><Badge>inherited</Badge></Td><Td />
            </tr>
          ))}
          {own.length + inherited.length === 0 && <tr><Td colSpan={5} className="text-muted">No attributes yet.</Td></tr>}
        </tbody>
      </Table>
      <AttributeForm categoryId={id} />
    </div>
  );
}
