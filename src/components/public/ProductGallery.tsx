"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface Media {
  id: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  url: string;
  alt: string | null;
}

export function ProductGallery({ media, title }: { media: Media[]; title: string }) {
  const items = media.filter((m) => m.type !== "DOCUMENT");
  const [active, setActive] = useState(0);
  const current = items[active];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-sage to-sand text-6xl font-semibold text-ink/30" aria-hidden>
        {title.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white">
        {current.type === "VIDEO" ? (
          <video src={current.url} controls preload="metadata" className="h-full w-full object-contain" />
        ) : (
          <Image src={current.url} alt={current.alt ?? title} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-contain" priority={active === 0} />
        )}
      </div>
      {items.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Product media">
          {items.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${m.type === "VIDEO" ? "video" : "image"} ${i + 1}`}
                aria-current={i === active}
                className={cn("relative block h-16 w-16 overflow-hidden rounded-lg border bg-white", i === active ? "border-ink" : "border-line")}
              >
                {m.type === "VIDEO" ? <span className="flex h-full items-center justify-center text-xs">▶</span> : <Image src={m.url} alt="" fill sizes="64px" className="object-cover" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
