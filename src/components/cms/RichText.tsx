import Link from "next/link";
import { parseRichText, type Inline } from "@/lib/richtext";

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((i, k) =>
        i.kind === "bold" ? (
          <strong key={k}>{i.text}</strong>
        ) : i.kind === "link" ? (
          i.href.startsWith("/") ? (
            <Link key={k} href={i.href} className="underline">{i.text}</Link>
          ) : (
            <a key={k} href={i.href} rel="noopener noreferrer nofollow" className="underline">{i.text}</a>
          )
        ) : (
          <span key={k}>{i.text}</span>
        ),
      )}
    </>
  );
}

export function RichText({ body }: { body: string }) {
  return (
    <div className="space-y-4 leading-relaxed">
      {parseRichText(body).map((b, i) =>
        b.kind === "h2" ? (
          <h2 key={i} className="pt-4 text-xl font-semibold"><Inlines items={b.inlines} /></h2>
        ) : b.kind === "h3" ? (
          <h3 key={i} className="pt-2 text-lg font-semibold"><Inlines items={b.inlines} /></h3>
        ) : b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}</ul>
        ) : (
          <p key={i}><Inlines items={b.inlines} /></p>
        ),
      )}
    </div>
  );
}
