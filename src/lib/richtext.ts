// Tiny, safe Markdown subset for CMS bodies: ## / ### headings, "- " lists, paragraphs,
// **bold** and [text](url). Output is a data structure rendered by React, so no HTML is ever injected.
export type Inline = { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "link"; text: string; href: string };
export type Block =
  | { kind: "h2" | "h3"; inlines: Inline[] }
  | { kind: "p"; inlines: Inline[] }
  | { kind: "ul"; items: Inline[][] };

const SAFE_HREF = /^(https?:\/\/|\/(?!\/)|mailto:)/i;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push({ kind: "text", text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else if (SAFE_HREF.test(m[3])) out.push({ kind: "link", text: m[2], href: m[3] });
    else out.push({ kind: "text", text: m[2] }); // unsafe scheme (javascript:, data:) => plain text
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

export function parseRichText(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "p", inlines: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "ul", items: list });
    list = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith("### ")) {
      flushPara(); flushList();
      blocks.push({ kind: "h3", inlines: parseInline(line.slice(4)) });
    } else if (line.startsWith("## ")) {
      flushPara(); flushList();
      blocks.push({ kind: "h2", inlines: parseInline(line.slice(3)) });
    } else if (line.startsWith("- ")) {
      flushPara();
      list.push(parseInline(line.slice(2)));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}
