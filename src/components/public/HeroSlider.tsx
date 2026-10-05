"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string;
  linkUrl: string;
}

const INTERVAL_MS = 6000;

/**
 * Home hero carousel. Same footprint as the old static hero (443px mobile / 464px from 640px up).
 * Accessible: pause/play control, pauses on hover/focus, no autoplay with reduced motion,
 * inactive slides are `inert`, arrow buttons + dots, swipe on touch.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const auto = playing && !hovering && !reduced && count > 1;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [auto, index, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What Tarf does"
      className="relative isolate h-[443px] overflow-hidden bg-ink text-paper sm:h-[464px]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            inert={!active}
            className={cn("absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none", active ? "opacity-100" : "opacity-0")}
          >
            <Image src={s.imageUrl} alt="" fill sizes="100vw" priority={i === 0} className="-z-10 object-cover object-[78%_center]" />
            {/* Darken only where the text sits so the illustration stays vivid. */}
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 to-ink/60 sm:hidden" />
            <div aria-hidden className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,rgb(16_21_18/0.92)_0%,rgb(16_21_18/0.72)_30%,rgb(16_21_18/0)_58%)] sm:block" />
            <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-4 pb-10">
              <h2 className="max-w-xl font-display text-3xl font-semibold leading-tight sm:text-5xl">{s.title}</h2>
              {s.subtitle && <p className="mt-4 max-w-md text-base text-paper/85 sm:text-lg">{s.subtitle}</p>}
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={s.linkUrl} className={buttonClass("accent", "lg")}>{s.ctaLabel}</Link>
                <Link href="/register?as=supplier" className={buttonClass("inverse", "lg")}>Sell on Tarf</Link>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-4 z-10 mx-auto flex max-w-7xl items-center gap-3 px-4">
            <ul className="flex items-center gap-2" aria-label="Choose slide">
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show slide ${i + 1}: ${s.title}`}
                    aria-current={i === index}
                    className={cn("h-2.5 rounded-full transition-all", i === index ? "w-8 bg-paper" : "w-2.5 bg-paper/50 hover:bg-paper/80")}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/50 text-xs hover:bg-white/10"
            >
              <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
            </button>
            <span className="sr-only" aria-live={auto ? "off" : "polite"}>{`Slide ${index + 1} of ${count}: ${slides[index].title}`}</span>
          </div>
          <div className="absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-3 sm:flex" style={{ pointerEvents: "none" }}>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" style={{ pointerEvents: "auto" }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/50 text-xl hover:bg-ink/80"><span aria-hidden>‹</span></button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" style={{ pointerEvents: "auto" }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/50 text-xl hover:bg-ink/80"><span aria-hidden>›</span></button>
          </div>
        </>
      )}
    </section>
  );
}
