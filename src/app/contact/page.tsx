import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Clock, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact — Tarf" };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Talk to a <em className="text-accent">human.</em></>} lede="Questions about a product, an order or anything else — send us a note and we'll get back to you." crumbs={[{ label: "Contact" }]} bg="bg-blush" />
      <section className="container-x py-14 lg:py-20 grid lg:grid-cols-[1fr_380px] gap-12">
        <ContactForm />
        <aside className="space-y-4">
          {[
            [Mail, "Email", "Use the form and we'll reply to your inbox."],
            [Clock, "Support hours", "Mon–Sat, 10:00–18:00 IST"],
            [MessageCircle, "Expected response", "Within one working day"],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Mail;
            return (
              <div key={t as string} className="flex gap-4 rounded-[24px] border border-line bg-white p-5">
                <span className="grid place-items-center w-11 h-11 rounded-2xl bg-sage shrink-0"><Icon size={20} /></span>
                <div><p className="font-semibold">{t as string}</p><p className="text-muted text-sm mt-0.5">{d as string}</p></div>
              </div>
            );
          })}
          <p className="text-sm text-muted px-1">Looking for a quick answer? Try the <Link href="/help" className="underline underline-offset-4 text-ink">Help centre</Link>.</p>
        </aside>
      </section>
    </>
  );
}
