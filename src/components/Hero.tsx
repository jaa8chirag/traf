"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Play, Check } from "lucide-react";
import { ProductVisual } from "./ProductVisual";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const up = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: d, ease },
  });

  return (
    <section className="relative overflow-hidden grain">
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #ffb48f, transparent)" }}
      />
      <div className="container-x relative grid lg:grid-cols-12 gap-10 lg:gap-6 items-center pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="lg:col-span-6 xl:col-span-6">
          <motion.p
            {...up(0)}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 backdrop-blur px-3.5 py-1.5 text-[13px] font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            New: the Workspace collection
          </motion.p>

          <motion.h1
            {...up(0.08)}
            className="font-display mt-6 text-[clamp(2.4rem,7.2vw,6rem)] leading-[0.98] font-medium"
          >
            Smart products for{" "}
            <span className="relative inline-block italic text-accent">
              better
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden>
                <motion.path
                  d="M3 8 C 50 2, 120 2, 197 7"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.9, ease }}
                />
              </svg>
            </span>{" "}
            everyday living.
          </motion.h1>

          <motion.p {...up(0.18)} className="mt-6 max-w-xl text-lg lg:text-xl text-muted leading-relaxed">
            Carefully selected, clearly explained, confidently purchased. Everyday essentials for your desk, home and
            routine — chosen for how well they work, not how loudly they&apos;re discounted.
          </motion.p>

          <motion.div {...up(0.28)} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/collections/workspace"
              className="group inline-flex items-center gap-2 h-14 pl-7 pr-3 rounded-full bg-ink text-paper font-medium hover:bg-accent transition-colors duration-300"
            >
              Explore the collection
              <span className="grid place-items-center w-9 h-9 rounded-full bg-paper text-ink group-hover:translate-x-0.5 transition-transform">
                <ArrowRight size={18} />
              </span>
            </Link>
            <a
              href="#how-we-choose"
              className="inline-flex items-center gap-2 h-14 px-6 rounded-full border border-ink/20 font-medium hover:bg-white transition-colors"
            >
              <Play size={14} fill="currentColor" /> How we choose
            </a>
          </motion.div>

          <motion.ul {...up(0.38)} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/75">
            {["Curated, not crowded", "Specs you can trust", "Support that answers"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check size={16} className="text-accent" strokeWidth={3} /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Visual composition */}
        <div className="lg:col-span-6 relative h-[420px] sm:h-[520px] lg:h-[620px]">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.1, ease }}
            className="absolute right-0 top-0 w-[78%] h-[84%] rounded-[36px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(16,21,18,.45)]"
          >
            <ProductVisual kind="stand" tone="sage" className="w-full h-full scale-110" />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease }}
            className="absolute left-0 bottom-6 w-[46%] aspect-square rounded-[28px] overflow-hidden border-4 border-paper shadow-xl floaty"
            style={{ ["--r" as string]: "-3deg" }}
          >
            <ProductVisual kind="charger" tone="ink" className="w-full h-full" />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease }}
            className="absolute right-2 bottom-0 w-[34%] aspect-[4/5] rounded-[24px] overflow-hidden border-4 border-paper shadow-xl floaty"
            style={{ ["--r" as string]: "3deg", animationDelay: "-3s" }}
          >
            <ProductVisual kind="holder" tone="sand" className="w-full h-full" />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 20 }}
            className="absolute left-[6%] top-[12%] bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
          >
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-sage text-ink font-display text-lg">★</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Aero Laptop Stand</p>
              <p className="text-xs text-muted">Six angles · folds flat</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
