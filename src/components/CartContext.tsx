"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { products } from "@/data/catalog";

export interface Line {
  slug: string;
  qty: number;
}

export interface Order {
  id: string;
  placedAt: number;
  lines: Line[];
  total: number;
  name: string;
  city: string;
}

interface CartCtx {
  lines: Line[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  orders: Order[];
  placeOrder: (o: Omit<Order, "id" | "placedAt">) => Order;
}

const Ctx = createContext<CartCtx | null>(null);
const CART_KEY = "tarf.cart";
const ORDERS_KEY = "tarf.orders";

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
  useEffect(() => {
    setLines(read<Line[]>(CART_KEY, []));
    setOrders(read<Order[]>(ORDERS_KEY, []));
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (ready) write(CART_KEY, lines);
  }, [lines, ready]);
  useEffect(() => {
    if (ready) write(ORDERS_KEY, orders);
  }, [orders, ready]);

  const add = useCallback(
    (slug: string, qty = 1) =>
      setLines((p) =>
        p.some((l) => l.slug === slug)
          ? p.map((l) => (l.slug === slug ? { ...l, qty: Math.min(10, l.qty + qty) } : l))
          : [...p, { slug, qty }],
      ),
    [],
  );
  const setQty = useCallback(
    (slug: string, qty: number) =>
      setLines((p) => (qty <= 0 ? p.filter((l) => l.slug !== slug) : p.map((l) => (l.slug === slug ? { ...l, qty: Math.min(10, qty) } : l)))),
    [],
  );
  const remove = useCallback((slug: string) => setLines((p) => p.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => setLines([]), []);
  const placeOrder = useCallback((o: Omit<Order, "id" | "placedAt">) => {
    const order: Order = { ...o, id: "TRF-" + Math.floor(100000 + Math.random() * 900000), placedAt: Date.now() };
    setOrders((p) => [order, ...p]);
    return order;
  }, []);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.qty * (products.find((p) => p.slug === l.slug)?.price ?? 0), 0);
    return { lines, count, subtotal, add, setQty, remove, clear, orders, placeOrder };
  }, [lines, orders, add, setQty, remove, clear, placeOrder]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
