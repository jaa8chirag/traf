"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Search, ShoppingBag, User, Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { useCart } from "./CartContext";

const nav = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections/workspace" },
  { label: "Offers", href: "/offers" },
  { label: "Why Tarf", href: "/why-my-ventures" },
  { label: "Quality & Trust", href: "/quality" },
  { label: "Help", href: "/help" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setSearchOpen(false));
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-paper/85 backdrop-blur-xl border-b border-line" : "bg-paper border-b border-transparent"
      }`}
    >
      <div className={`container-x flex items-center gap-4 transition-all duration-300 ${scrolled ? "h-14" : "h-[72px]"}`}>
        <button
          className="lg:hidden -ml-2 p-2 rounded-full hover:bg-ink/5"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>

        <Link href="/" className="shrink-0" aria-label="Tarf home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 ml-8">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="relative px-3 py-2 text-[15px] font-medium text-ink/80 hover:text-ink transition-colors group"
            >
              {n.label}
              <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
            </a>
          ))}
        </nav>

        <form
          role="search"
          action="/search"
          className="hidden md:flex ml-auto items-center gap-2 w-full max-w-xs bg-paper-2 hover:bg-white focus-within:bg-white border border-line focus-within:border-ink/40 rounded-full px-4 h-11 transition-colors"
        >
          <Search size={18} className="text-muted" aria-hidden />
          <input
            name="q"
            placeholder="Search stands, chargers, lamps…"
            aria-label="Search products"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted"
          />
          <kbd className="hidden xl:block text-[11px] text-muted border border-line rounded px-1.5 py-0.5">/</kbd>
        </form>

        <div className="ml-auto md:ml-0 flex items-center gap-1">
          <button
            className="md:hidden p-2.5 rounded-full hover:bg-ink/5"
            aria-label="Search"
            onClick={() => setSearchOpen((s) => !s)}
          >
            <Search size={21} />
          </button>
          <Link href="/account" aria-label="Account" className="hidden sm:flex p-2.5 rounded-full hover:bg-ink/5">
            <User size={21} />
          </Link>
          <Link href="/cart" aria-label={`Cart, ${count} items`} className="relative p-2.5 rounded-full hover:bg-ink/5">
            <ShoppingBag size={21} />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-accent text-white text-[11px] font-semibold"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.form
            role="search"
            action="/search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden container-x"
          >
            <div className="flex items-center gap-2 bg-white border border-line rounded-full px-4 h-12 mb-3">
              <Search size={18} className="text-muted" />
              <input name="q" autoFocus placeholder="Search products" aria-label="Search products" className="w-full outline-none text-sm bg-transparent" />
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-ink/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed top-0 left-0 bottom-0 w-[88%] max-w-sm bg-paper lg:hidden p-6 flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
            >
              <div className="flex items-center justify-between mb-8">
                <Logo />
                <button className="p-2 -mr-2 rounded-full hover:bg-ink/5" aria-label="Close menu" onClick={() => setOpen(false)}>
                  <X size={22} />
                </button>
              </div>
              <nav className="flex flex-col">
                {nav.map((n, i) => (
                  <motion.a
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.1 }}
                    className="font-display text-3xl py-3 border-b border-line flex items-center justify-between"
                  >
                    {n.label}
                    <ArrowUpRight size={20} className="text-muted" />
                  </motion.a>
                ))}
              </nav>
              <div className="mt-auto flex gap-3 text-sm text-muted">
                <Link href="/account" className="underline underline-offset-4">Account</Link>
                <Link href="/track-order" className="underline underline-offset-4">Track order</Link>
                <Link href="/contact" className="underline underline-offset-4">Contact</Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
