/** Only same-origin relative paths; blocks `//evil.com` and `/\evil.com` open redirects. */
export function safeNext(raw: FormDataEntryValue | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : null;
}
