"use client";

import { useState } from "react";
import { UploadButton } from "./uploads";

export interface MediaItem {
  type: "IMAGE" | "VIDEO";
  key: string;
  viewUrl: string | null;
}

/** Ordered product media. Posts as repeated `media` fields: "IMAGE|public/products/…". First image is the cover. */
export function MediaField({ initial, max }: { initial: MediaItem[]; max: number }) {
  const [items, setItems] = useState<MediaItem[]>(initial);

  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const j = i + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <input key={m.key} type="hidden" name="media" value={`${m.type}|${m.key}`} />
      ))}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((m, i) => (
          <li key={m.key} className="rounded-xl border border-line bg-white p-2 text-xs">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-paper-2">
              {m.type === "IMAGE" && m.viewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- direct object-storage URL; optimiser config comes with CP-3
                <img src={m.viewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-muted">{m.type === "VIDEO" ? "Video" : "Image"}</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted">{i === 0 ? "Cover" : `#${i + 1}`}</span>
              <span className="flex gap-1">
                <button type="button" aria-label="Move earlier" className="px-1 hover:text-accent" onClick={() => move(i, -1)}>←</button>
                <button type="button" aria-label="Move later" className="px-1 hover:text-accent" onClick={() => move(i, 1)}>→</button>
                <button type="button" aria-label="Remove" className="px-1 text-danger" onClick={() => setItems((xs) => xs.filter((x) => x.key !== m.key))}>✕</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {items.length < max && (
        <UploadButton
          purpose="product-media"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          label="Add images / video"
          multiple
          onUploaded={(f) =>
            setItems((xs) =>
              xs.length >= max ? xs : [...xs, { key: f.key, type: f.contentType.startsWith("video/") ? "VIDEO" : "IMAGE", viewUrl: f.publicUrl }],
            )
          }
        />
      )}
      <p className="text-xs text-muted">Up to {max} files. JPG/PNG/WebP up to 10 MB, MP4 up to 50 MB.</p>
    </div>
  );
}
