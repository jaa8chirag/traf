"use client";

import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";

type State = "idle" | "loading" | "success" | "failure";
const field = "w-full h-13 py-3.5 px-4 rounded-2xl border bg-white outline-none transition-colors focus:border-ink";

export function ContactForm() {
  const [v, setV] = useState({ name: "", email: "", order: "", topic: "Product question", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>("idle");

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setV({ ...v, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (v.name.trim().length < 2) er.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(v.email)) er.email = "Enter a valid email address.";
    if (v.message.trim().length < 10) er.message = "Tell us a little more (at least 10 characters).";
    setErrors(er);
    if (Object.keys(er).length) return;
    setState("loading");
    // TODO: send to support inbox / CRM
    setTimeout(() => setState("success"), 900);
  };

  if (state === "success")
    return (
      <div role="status" className="rounded-[28px] bg-sage p-10 text-center">
        <span className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-ink text-paper"><Check /></span>
        <h2 className="font-display text-3xl mt-5">Message sent</h2>
        <p className="text-ink/70 mt-2">Thanks, {v.name.split(" ")[0]}. We&apos;ll reply to {v.email} within one working day.</p>
      </div>
    );

  const err = (k: string) => (errors[k] ? <p id={`e-${k}`} className="text-sm text-accent-ink mt-1.5">{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {state === "failure" && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl bg-blush p-4 text-accent-ink"><AlertCircle size={18} /> Something went wrong. Please try again.</p>
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">Name</label>
          <input id="name" value={v.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="e-name" className={`${field} ${errors.name ? "border-accent" : "border-line"}`} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
          <input id="email" type="email" value={v.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby="e-email" className={`${field} ${errors.email ? "border-accent" : "border-line"}`} />
          {err("email")}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium mb-1.5">Topic</label>
          <select id="topic" value={v.topic} onChange={set("topic")} className={`${field} border-line`}>
            {["Product question", "Order help", "Returns & refunds", "Partnership", "Other"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="order" className="block text-sm font-medium mb-1.5">Order number <span className="text-muted font-normal">(optional)</span></label>
          <input id="order" placeholder="TRF-123456" value={v.order} onChange={set("order")} className={`${field} border-line`} />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1.5">How can we help?</label>
        <textarea id="message" rows={5} value={v.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby="e-message" className={`${field} h-auto ${errors.message ? "border-accent" : "border-line"}`} />
        {err("message")}
      </div>
      <button disabled={state === "loading"} className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors disabled:opacity-70">
        {state === "loading" ? <><Loader2 size={18} className="animate-spin" /> Sending…</> : "Submit enquiry"}
      </button>
    </form>
  );
}
