export type NotifyChannel = "email" | "sms" | "whatsapp";

export interface NotifyMessage {
  channel: NotifyChannel;
  to: string;
  subject?: string;
  /** Plain-text body for CP-1; templating arrives with CP-6. */
  text: string;
  locale: string;
}

export interface Notifier {
  send(msg: NotifyMessage): Promise<{ providerRef: string }>;
}
