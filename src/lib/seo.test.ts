import { describe, expect, it } from "vitest";
import { jsonLdString } from "./seo";

describe("jsonLdString", () => {
  it("escapes < so injected markup cannot terminate the script tag", () => {
    const out = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
