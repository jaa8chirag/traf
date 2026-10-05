import { describe, expect, it } from "vitest";
import { isValidShowroomSlug, resolveTenantSlug } from "./tenant";

describe("resolveTenantSlug", () => {
  it("resolves a tenant subdomain", () => {
    expect(resolveTenantSlug("acme-tiles.tarf.example", "tarf.example")).toBe("acme-tiles");
  });
  it("is case-insensitive", () => {
    expect(resolveTenantSlug("Acme.Tarf.Example", "tarf.example")).toBe("acme");
  });
  it("returns null for the apex and reserved labels", () => {
    expect(resolveTenantSlug("tarf.example", "tarf.example")).toBeNull();
    expect(resolveTenantSlug("www.tarf.example", "tarf.example")).toBeNull();
    expect(resolveTenantSlug("admin.tarf.example", "tarf.example")).toBeNull();
  });
  it("rejects nested subdomains, bad labels and foreign hosts", () => {
    expect(resolveTenantSlug("a.b.tarf.example", "tarf.example")).toBeNull();
    expect(resolveTenantSlug("-bad-.tarf.example", "tarf.example")).toBeNull();
    expect(resolveTenantSlug("acme.evil.com", "tarf.example")).toBeNull();
    expect(resolveTenantSlug("eviltarf.example", "tarf.example")).toBeNull();
  });
});

describe("isValidShowroomSlug", () => {
  it("enforces format and reserved words", () => {
    expect(isValidShowroomSlug("acme-tiles")).toBe(true);
    expect(isValidShowroomSlug("ab")).toBe(false);
    expect(isValidShowroomSlug("www")).toBe(false);
    expect(isValidShowroomSlug("Has_Caps")).toBe(false);
  });
});
