# Repo Audit — Tarf B2C store (tag `b2c-final`)

Audited on `main` @ `6d43c8b`. **Nothing has been deleted.** Classifications are proposals for approval before CP-1.

## Current state
| Area | Finding |
|---|---|
| Stack | Next.js **16.3.8**, React **19.2.8**, TypeScript 5, Tailwind **v4** (`@theme inline` tokens in `globals.css`), `motion`, `lucide-react`, ESLint 9 + `eslint-config-next`. Fonts: Geist + Fraunces via `next/font`. |
| Rendering | App Router, almost entirely static (`○`) + SSG for `[slug]` pages; `/search` dynamic. Only one layout (`src/app/layout.tsx`) wrapping everything in `CartProvider`, `Header`, `Footer`. |
| Database | **None.** No Prisma/ORM, no `.env`. Catalogue is hard-coded in `src/data/catalog.ts` (4 categories, 6 sample products) and `src/data/extra.ts`. |
| Auth | **None.** `/account` is a static page. |
| Cart / checkout / orders | Client-only: `CartContext` persists to `localStorage` (`tarf.cart`, `tarf.orders`); `CheckoutForm` validates an Indian pincode and creates a **fake order in localStorage** ("Demo checkout: no payment is taken yet"; `TODO: create order + payment session`). |
| Payments | **None** integrated (UI offers UPI/card/netbanking/COD radio buttons only). |
| Forms | Contact, Newsletter, Track-Order are client-only with no backend. |
| Tests | None. No CI config. |
| Deployment config | **None** (no Dockerfile, no `vercel.json`, no pipelines, `next.config.ts` empty). Nothing to protect/ask about yet — Azure setup is net-new in CP-12. |
| Git | 2 commits on `main`; tree was clean. |
| Baseline health | `npm run lint` ✅, `npm run build` ✅ (33 static pages) before any change. |

The repo **is** Next.js + TypeScript, so no stack migration is needed. Postgres/Prisma is net-new (no existing DB to migrate).

## Classification

| Part | Path | Verdict | Reason |
|---|---|---|---|
| Next/TS/Tailwind/ESLint config | `package.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts` | **Reuse** | Already the target stack and Next 16-correct. Only additions (Prisma, scripts) so far. |
| Design tokens | `src/app/globals.css` | **Adapt** | Warm paper/ink/orange palette is a usable brand base but is consumer-retail; B2B needs denser UI, neutral surfaces, status colours, dark-on-light tables. Keep tokens, extend. |
| Fonts | `layout.tsx` (Geist + Fraunces) | **Adapt** | Keep Geist for UI; Fraunces display is fine for marketing headings only. Add multi-script fallbacks for i18n (CP-12). |
| Root layout | `src/app/layout.tsx` | **Replace** | Single shell with consumer header/cart. Becomes a minimal root + per-panel layouts (route groups). Keep the `LayoutProps<"/">` pattern and font setup. |
| Logo | `Logo.tsx` | **Reuse** | Brand mark independent of store type. |
| Presentational primitives | `Reveal.tsx`, `SectionHead.tsx`, `PageHero.tsx`, `FAQ.tsx`, `Footer.tsx`, `AnnouncementBar.tsx` | **Adapt** | Generic building blocks; copy/links are B2C. Re-theme into `components/ui` + marketing sections. |
| Header | `Header.tsx` | **Replace** | Cart-bag, consumer nav. B2B needs category mega-menu, search with tabs, Inquiry Basket, messages, login/role switch. Reuse its scroll/ESC/mobile-drawer logic. |
| Product card / rail / visual | `ProductCard.tsx`, `ProductRail.tsx`, `ProductVisual.tsx`, `ProductView.tsx`, `FeaturedCollection.tsx` | **Replace** | Retail card (single INR price, add-to-cart, SVG illustrations). B2B card needs price range in US$, MOQ+unit, supplier/tier/audited badges, location, certs, Send Inquiry. Reuse `ProductVisual` only as placeholder art for seed data. |
| Shop browsing | `ShopBrowser.tsx`, `shop/*`, `collections/*`, `search/page.tsx`, `Categories.tsx` | **Replace** | Client-side filter over a 6-item array; replaced by server-rendered category pages + Meilisearch (CP-3/4). |
| Catalogue data | `src/data/catalog.ts`, `extra.ts` | **Delete** (after seed is verified) | Sample data; replaced by Prisma + seed. Types are retail-shaped (single price, stock). |
| Product catalogue **concept** | — | **Adapt** | Direction: `Product` survives as a model but gains supplier, MOQ, tiers, spec EAV, moderation. Nothing carries over in code, only the idea. |
| Cart | `CartContext.tsx`, `cart/page.tsx` | **Replace** | Cart semantics (many SKUs, one merchant) don't fit B2B. The nearest analogue is the **Inquiry Basket** (many products → many suppliers → one message); reuse the localStorage-hydration pattern for guest basket until login. Escrow Start Order replaces checkout. |
| Checkout | `CheckoutForm.tsx`, `checkout/*`, `Confirmation.tsx`, `order-confirmation/*` | **Adapt → Replace** | Address validation + step layout and the confirmation screen are reusable ideas for the CP-10 escrow checkout; payment/COD/INR and fake order creation are not. |
| Order tracking | `TrackOrder.tsx`, `track-order/*` | **Adapt** | Becomes the order timeline/shipment tracking component in `/orders/[id]` (CP-10). |
| Account | `account/page.tsx` | **Replace** | Static page; real auth + buyer panel (CP-1). |
| Content pages | `about`, `contact`, `help`, `quality`, `why-my-ventures`, `offers`, `reviews`, `[policy]` + `ContactForm`, `HelpCenter`, `Education`, `WhyTarf`, `Newsletter`, `Reviews`, `Hero`, `Newsletter` | **Adapt / Delete** | Contact, help, policies → move to CMS-driven `(public)` pages (copy rewritten for B2B). `offers`, `why-my-ventures`, `Education`, retail `Hero`, retail `Reviews` → **delete** (consumer marketing). `ContactForm`/`Newsletter` need a real backend (route handler + `SupportTicket`/notification). |
| `not-found.tsx` | | **Reuse** | Generic. |
| Public assets | `public/*.svg` | **Delete** | Unused create-next-app boilerplate. |
| `README.md` | | **Replace** | Boilerplate; rewrite in CP-1 with setup instructions. |
| `.gitignore` | | **Adapt (done)** | Added `!.env.example` and `/src/generated/`. |
| `tsconfig.tsbuildinfo`, `.next/` | | **Ignore** | Already gitignored (`*.tsbuildinfo`, `/.next/`). |

## Changes made in CP-0 to existing files
- `package.json` / lockfile: added `@prisma/client`, `@prisma/adapter-pg`, `pg` (deps); `prisma`, `tsx`, `dotenv`, `@types/pg` (dev); scripts `typecheck`, `postinstall` (`prisma generate`), `db:*`.
- `.gitignore`: `!.env.example`, `/src/generated/`.
- No source files under `src/app` or `src/components` were modified.

## Risks noted
1. `postinstall: prisma generate` means a fresh `npm ci` regenerates the client automatically (needed because `prisma/seed.ts` is type-checked by `next build`). If the production image build must avoid network at install time, move generation to the Dockerfile (CP-12).
2. `npm audit` reports 4 high advisories, all in the Prisma CLI dev tooling chain (transitive `mysql2`, which we do not use); `--force` would downgrade Prisma to v6, so it is **not** applied. Production deps are unaffected; re-check at CP-1.
3. Retail copy and INR pricing are embedded in components; removal in CP-1 must be done page-by-page to keep the build green.
