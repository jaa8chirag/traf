import type { Metadata } from "next";
import { CsvImport } from "@/components/supplier/CsvImport";
import { Card } from "@/components/ui";
import { CSV_TEMPLATE } from "@/modules/catalog";
import { requireSupplier } from "@/modules/identity";

export const metadata: Metadata = { title: "Bulk upload", robots: { index: false } };

export default async function ImportPage() {
  await requireSupplier();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Bulk upload</h1>
      <Card className="space-y-2 text-sm">
        <p>Upload a CSV to create <strong>draft</strong> products (up to 500 rows). Add photos and specifications afterwards, then submit each for review.</p>
        <p className="text-muted">Required columns: <code>title</code>, <code>category_slug</code> (final-level category), <code>moq</code>, <code>moq_unit</code>. Optional: <code>currency</code>, <code>price_min</code>, <code>price_max</code>, <code>lead_time_days</code>, <code>summary</code>, <code>keywords</code>.</p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="tarf-products-template.csv" className="font-medium underline">
          Download template
        </a>
      </Card>
      <CsvImport />
    </div>
  );
}
