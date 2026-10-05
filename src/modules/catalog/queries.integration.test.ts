// Public visibility rules against the compose Postgres: only LIVE products of VERIFIED suppliers are exposed.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/storage", () => ({
  storage: () => ({ publicUrl: (k: string) => `http://cdn.test/${k}`, signedGetUrl: async (k: string) => k, exists: async () => true, delete: async () => undefined, presignUpload: async () => ({ url: "", headers: {} }) }),
}));

const { prisma } = await import("@/lib/db");
const q = await import("./queries");

const run = Date.now().toString(36);
const ids = { users: [] as string[], companies: [] as string[] };
let chargers = { id: "", path: "" };
let tiles = { id: "" };
const slugs = { live: "", draft: "", hidden: "" };

async function company(tag: string, status: "VERIFIED" | "PENDING_VERIFICATION", name: string) {
  const user = await prisma.user.create({ data: { email: `${tag}-${run}@test.tarf` } });
  const c = await prisma.company.create({ data: { ownerId: user.id, slug: `${tag}-${run}`, name, status, city: "Pune", province: "MH", country: "IN" } });
  ids.users.push(user.id);
  ids.companies.push(c.id);
  return c;
}
const product = (companyId: string, categoryId: string, title: string, status: "LIVE" | "DRAFT") =>
  prisma.product.create({ data: { companyId, categoryId, title, slug: `${title.toLowerCase().replace(/\W+/g, "-")}-${run}`, status, publishedAt: status === "LIVE" ? new Date() : null, moq: 10, moqUnit: "pcs", priceMin: 1, priceMax: 2 } });

beforeAll(async () => {
  const c = await prisma.category.findFirstOrThrow({ where: { slug: "chargers" } });
  chargers = { id: c.id, path: c.path };
  tiles = { id: (await prisma.category.findFirstOrThrow({ where: { slug: "ceramic-tiles" } })).id };

  const ok = await company("vis", "VERIFIED", `Zzvis ${run} Ltd`);
  const bad = await company("unv", "PENDING_VERIFICATION", `Zzunv ${run} Ltd`);
  slugs.live = (await product(ok.id, chargers.id, `Zzlive Charger ${run}`, "LIVE")).slug;
  slugs.draft = (await product(ok.id, chargers.id, `Zzdraft Charger ${run}`, "DRAFT")).slug;
  await product(ok.id, tiles.id, `Zztile Product ${run}`, "LIVE");
  slugs.hidden = (await product(bad.id, chargers.id, `Zzhidden Charger ${run}`, "LIVE")).slug;
});

afterAll(async () => {
  await prisma.company.deleteMany({ where: { id: { in: ids.companies } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
  await prisma.$disconnect();
});

const titles = (r: { items: Array<{ title: string }> }) => r.items.map((i) => i.title);

describe("storefront visibility", () => {
  it("lists only LIVE products of VERIFIED suppliers", async () => {
    const r = await q.listProducts({ q: "Zz", pageSize: 60 });
    expect(titles(r).sort()).toEqual([`Zzlive Charger ${run}`, `Zztile Product ${run}`]);
  });

  it("category listing includes the subtree but not siblings", async () => {
    const leaf = await q.listProducts({ categoryPath: chargers.path, q: run, pageSize: 60 });
    expect(titles(leaf)).toEqual([`Zzlive Charger ${run}`]);
    const root = await q.listProducts({ categoryPath: chargers.path.split("/")[0], q: run, pageSize: 60 });
    expect(titles(root)).toContain(`Zzlive Charger ${run}`);
    expect(titles(root)).not.toContain(`Zztile Product ${run}`);
  });

  it("does not match a path that merely shares a prefix", async () => {
    const r = await q.listProducts({ categoryPath: chargers.path.slice(0, -2), q: run });
    expect(r.total).toBe(0);
  });

  it("returns a product page only for visible products", async () => {
    expect(await q.getProductPage(slugs.live)).not.toBeNull();
    expect(await q.getProductPage(slugs.draft)).toBeNull();
    expect(await q.getProductPage(slugs.hidden)).toBeNull();
  });

  it("card data carries the fields the UI needs", async () => {
    const r = await q.listProducts({ q: `Zzlive Charger ${run}` });
    expect(r.items[0]).toMatchObject({ moq: 10, moqUnit: "pcs", priceMin: "1", priceMax: "2", supplier: { slug: `vis-${run}`, location: "Pune, MH, IN" }, category: { path: chargers.path } });
  });

  it("supplier listings, pages and A–Z exclude unverified companies", async () => {
    const s = await q.listSuppliers({ q: "Zz", pageSize: 60 });
    expect(s.items.map((x) => x.slug)).toEqual([`vis-${run}`]);
    expect(await q.getSupplierPage(`unv-${run}`)).toBeNull();
    expect((await q.getSupplierPage(`vis-${run}`))?.productCount).toBe(2);
    const az = await q.listSuppliers({ letter: "Z", pageSize: 60 });
    expect(az.items.map((x) => x.slug)).toContain(`vis-${run}`);
    expect(az.items.map((x) => x.slug)).not.toContain(`unv-${run}`);
  });

  it("sitemap queries expose only public records", async () => {
    const products = await q.sitemapProducts(0);
    expect(products.some((p) => p.slug === slugs.hidden)).toBe(false);
    expect(products.some((p) => p.slug === slugs.live)).toBe(true);
    const suppliers = await q.sitemapSuppliers(0);
    expect(suppliers.map((s) => s.slug)).not.toContain(`unv-${run}`);
  });

  it("paginates and validates letters", async () => {
    const p1 = await q.listProducts({ q: `${run}`, pageSize: 1, page: 1 });
    expect(p1.pageCount).toBe(2);
    expect(q.normalizeLetter("c")).toBe("C");
    expect(q.normalizeLetter("0-9")).toBe("0-9");
    expect(q.normalizeLetter("ab")).toBeNull();
    expect(q.normalizeLetter("é")).toBeNull();
  });
});
