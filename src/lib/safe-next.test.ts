import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("accepts relative paths", () => {
    expect(safeNext("/buyer/dashboard?x=1")).toBe("/buyer/dashboard?x=1");
  });
  it("rejects absolute, protocol-relative and backslash URLs", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNext(bad)).toBeNull();
    }
  });
});
