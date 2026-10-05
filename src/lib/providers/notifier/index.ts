import "server-only";
import type { Notifier } from "./types";
import { SmtpNotifier } from "./smtp";

let instance: Notifier | undefined;

export function notifier(): Notifier {
  instance ??= new SmtpNotifier();
  return instance;
}
export type { Notifier, NotifyMessage } from "./types";
