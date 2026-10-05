import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { Notifier, NotifyMessage } from "./types";

/** Email via SMTP (Mailpit locally). SMS/WhatsApp are rejected until their providers exist. */
export class SmtpNotifier implements Notifier {
  private transport = nodemailer.createTransport({
    host: env().SMTP_HOST,
    port: env().SMTP_PORT,
    secure: false,
    auth: env().SMTP_USER ? { user: env().SMTP_USER, pass: env().SMTP_PASSWORD } : undefined,
  });

  async send(msg: NotifyMessage): Promise<{ providerRef: string }> {
    if (msg.channel !== "email") throw new Error(`Channel not configured: ${msg.channel}`);
    const info = await this.transport.sendMail({
      from: env().EMAIL_FROM,
      to: msg.to,
      subject: msg.subject ?? "Tarf",
      text: msg.text,
    });
    return { providerRef: info.messageId };
  }
}
