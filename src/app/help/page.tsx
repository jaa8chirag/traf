import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { HelpCenter } from "@/components/HelpCenter";

export const metadata: Metadata = { title: "Help centre — Tarf" };

export default function HelpPage() {
  return (
    <>
      <PageHero eyebrow="Help centre" title={<>How can we <em className="text-accent">help?</em></>} lede="Quick answers on orders, shipping, returns, warranty and payments." crumbs={[{ label: "Help" }]} bg="bg-sand" />
      <HelpCenter />
    </>
  );
}
