import { describe, expect, it } from "vitest";
import { can, type Access } from "./rbac";

const none: Access = { staff: null, companies: [], isBuyer: true };

const staff = (roleKey: string, perms: string[]): Access => ({
  ...none,
  staff: { roleKey, permissions: new Set(perms) },
});

const supplier: Access = {
  ...none,
  companies: [
    { companyId: "c1", companySlug: "acme", companyName: "Acme", roleKey: "supplier_sales", permissions: new Set(["inquiry.reply"]) },
  ],
};

describe("can()", () => {
  it("denies platform permissions to non-staff", () => {
    expect(can(none, "supplier.verify")).toBe(false);
    expect(can(supplier, "supplier.verify")).toBe(false);
  });

  it("allows only granted permissions to staff", () => {
    const a = staff("verification", ["supplier.verify"]);
    expect(can(a, "supplier.verify")).toBe(true);
    expect(can(a, "order.release_escrow")).toBe(false);
  });

  it("treats super_admin as holding every permission", () => {
    expect(can(staff("super_admin", []), "anything.at.all")).toBe(true);
  });

  it("scopes company permissions to that company only", () => {
    expect(can(supplier, "inquiry.reply", { companyId: "c1" })).toBe(true);
    expect(can(supplier, "inquiry.reply", { companyId: "other" })).toBe(false);
    expect(can(supplier, "product.manage", { companyId: "c1" })).toBe(false);
  });

  it("does not let staff roles satisfy a company-scoped check", () => {
    expect(can(staff("super_admin", []), "inquiry.reply", { companyId: "c1" })).toBe(false);
  });
});
