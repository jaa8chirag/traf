import { describe, expect, it } from "vitest";
import { demoEmails, isDemoEmail, isDemoLogin } from "./demo";

describe("demo login", () => {
  it("is fully disabled without a code", () => {
    expect(demoEmails({})).toEqual([]);
    expect(isDemoEmail({}, "buyer@demo.tarf.test")).toBe(false);
    expect(isDemoLogin({}, "buyer@demo.tarf.test", "123456")).toBe(false);
    expect(isDemoLogin({ code: "" }, "buyer@demo.tarf.test", "")).toBe(false);
  });
  it("accepts only the code, only for allowed emails (default = the seeded demo accounts)", () => {
    const cfg = { code: "424242" };
    expect(isDemoLogin(cfg, "buyer@demo.tarf.test", "424242")).toBe(true);
    expect(isDemoLogin(cfg, "BUYER@demo.tarf.test", "424242")).toBe(true);
    expect(isDemoLogin(cfg, "buyer@demo.tarf.test", "000000")).toBe(false);
    expect(isDemoLogin(cfg, "random@gmail.com", "424242")).toBe(false);
  });
  it("honours an explicit email list and rejects short codes", () => {
    expect(isDemoLogin({ code: "424242", emails: "a@x.com, b@x.com" }, "b@x.com", "424242")).toBe(true);
    expect(isDemoLogin({ code: "424242", emails: "a@x.com" }, "buyer@demo.tarf.test", "424242")).toBe(false);
    expect(isDemoLogin({ code: "1234", emails: "a@x.com" }, "a@x.com", "1234")).toBe(false);
  });
});
