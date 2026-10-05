import { describe, expect, it } from "vitest";
import { parseInline, parseRichText } from "./richtext";

describe("parseRichText", () => {
  it("builds headings, paragraphs and lists", () => {
    const blocks = parseRichText("## Title\n\nHello **world**.\nSecond line.\n\n- a\n- b\n\n### Sub\ntext");
    expect(blocks.map((b) => b.kind)).toEqual(["h2", "p", "ul", "h3", "p"]);
    const ul = blocks[2];
    expect(ul.kind === "ul" && ul.items).toHaveLength(2);
  });
});

describe("parseInline", () => {
  it("keeps safe links and downgrades dangerous schemes to text", () => {
    expect(parseInline("[ok](https://a.com) [rel](/help) [mail](mailto:x@y.z)").filter((i) => i.kind === "link")).toHaveLength(3);
    const bad = parseInline("[x](javascript:alert(1)) [y](//evil.com) [z](data:text/html,hi)");
    expect(bad.every((i) => i.kind !== "link")).toBe(true);
  });
  it("never emits HTML: angle brackets stay text", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ kind: "text", text: "<script>alert(1)</script>" }]);
  });
});
