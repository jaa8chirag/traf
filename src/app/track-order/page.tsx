import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { TrackOrder } from "@/components/TrackOrder";

export const metadata: Metadata = { title: "Track order — Tarf" };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Track order" title={<>Where&apos;s my <em className="text-accent">order?</em></>} lede="Enter your order number to see its status. No account needed." crumbs={[{ label: "Track order" }]} bg="bg-sky" />
      <TrackOrder />
    </>
  );
}
