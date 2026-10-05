import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { t } from "@/lib/i18n/t";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: { default: "Tarf — B2B sourcing marketplace", template: "%s | Tarf" },
  description: "Discover verified suppliers and manufacturers, send inquiries and source with protected payments.",
  applicationName: t("brand.name"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
