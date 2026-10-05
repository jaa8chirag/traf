// Minimal i18n seam. All user-facing strings go through t() from day one so CP-12
// can swap in locale routing + catalogues without touching call sites.
import { en } from "./messages/en";

export type MessageKey = keyof typeof en;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template: string = en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
