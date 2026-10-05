"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";

export type UploadPurpose = "company-document" | "company-logo" | "product-media";

export interface UploadedFile {
  key: string;
  publicUrl: string | null;
  contentType: string;
  name: string;
}

/** Presign -> PUT straight to storage. Resolves with the stored key, or throws a user-readable Error. */
export async function uploadFile(purpose: UploadPurpose, file: File): Promise<UploadedFile> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose, contentType: file.type, sizeBytes: file.size }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; key?: string; url?: string; headers?: Record<string, string>; publicUrl?: string | null };
  if (!res.ok || !data.key || !data.url) throw new Error(data.error ?? "Could not start the upload");
  const put = await fetch(data.url, { method: "PUT", headers: data.headers, body: file });
  if (!put.ok) throw new Error("Upload failed; please try again");
  return { key: data.key, publicUrl: data.publicUrl ?? null, contentType: file.type, name: file.name };
}

interface PickerProps {
  purpose: UploadPurpose;
  accept: string;
  label: string;
  multiple?: boolean;
  onUploaded: (f: UploadedFile) => void | Promise<void>;
}

/** Button + hidden file input that uploads each chosen file and reports it via onUploaded. */
export function UploadButton({ purpose, accept, label, multiple, onUploaded }: PickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) await onUploaded(await uploadFile(purpose, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => onChange(e.target.files)} />
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
