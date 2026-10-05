import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const codeSchema = z.string().trim().regex(/^\d{6}$/);
export const intentSchema = z.enum(["buyer", "supplier"]).default("buyer");
export const purposeSchema = z.enum(["login", "admin_login"]);

export type Intent = z.infer<typeof intentSchema>;
export type OtpPurpose = z.infer<typeof purposeSchema>;
