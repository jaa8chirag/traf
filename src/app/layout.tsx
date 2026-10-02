import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
  title: "Tarf — Smart products for better everyday living",
  description:
    "Carefully selected, clearly explained, confidently purchased. Discover curated tech, workspace and home essentials from Tarf.",
  openGraph: {
    title: "Tarf — Smart products for better everyday living",
    description:
      "Curated everyday products, clearly explained. Shop Tarf for tech, workspace and home essentials.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
