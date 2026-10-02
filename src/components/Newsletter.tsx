"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type S = "idle" | "loading" | "success" | "error";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<S>("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("loading");
    // TODO: connect to CRM / email provider (brief §16)
    setTimeout(() => setState("success"), 800);
  };

  return (
    <section id="notify" className="container-x pb-20 lg:pb-28 scroll-mt-20">
      <div className="relative overflow-hidden rounded-[36px] bg-accent text-white p-8 sm:p-14 lg:p-20 grid lg:grid-cols-2 gap-10 items-center">
        <div aria-hidden className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/10" />
        <div aria-hidden className="absolute right-20 -bottom-32 w-80 h-80 rounded-full bg-black/10" />
        <div className="relative">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] font-medium">
            Be first to what&apos;s <em>next.</em>
          </h2>
          <p className="mt-4 text-white/85 text-lg max-w-md">
            New arrivals and new categories, straight to your inbox. Thoughtful, occasional, never spammy.
          </p>
        </div>

        <form onSubmit={submit} noValidate className="relative">
          {state === "success" ? (
            <p className="flex items-center gap-3 text-xl font-display bg-white/15 rounded-full px-6 h-16" role="status">
              <Check /> You&apos;re on the list. Thank you!
            </p>
          ) : (
            <>
              <label htmlFor="nl-email" className="sr-only">Email address</label>
              <div className="flex items-center bg-white rounded-full p-1.5 pl-6 text-ink">
                <input
                  id="nl-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  placeholder="you@email.com"
                  aria-invalid={state === "error"}
                  aria-describedby="nl-msg"
                  className="flex-1 min-w-0 h-12 bg-transparent outline-none placeholder:text-muted"
                />
                <button
                  disabled={state === "loading"}
                  className="h-12 px-6 rounded-full bg-ink text-paper font-medium flex items-center gap-2 hover:bg-ink-2 disabled:opacity-70 transition-colors"
                >
                  {state === "loading" ? <Loader2 size={18} className="animate-spin" /> : <>Subscribe <ArrowRight size={16} /></>}
                </button>
              </div>
              <p id="nl-msg" role={state === "error" ? "alert" : undefined} className={`mt-3 text-sm pl-6 ${state === "error" ? "text-white font-medium" : "text-white/75"}`}>
                {state === "error" ? "Please enter a valid email address." : "Unsubscribe any time."}
              </p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
