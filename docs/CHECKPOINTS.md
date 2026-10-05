# Tarf B2B Rebuild — Checkpoint Plan

Each checkpoint ends with: `npm run lint`, `npm run typecheck`, `npx prisma validate`, `npm run build` green; a demo script; and a report. **We start the next CP only after approval.** No `any` in new code. Website only.

Legend: **Scope** = what is built. **Done when** = acceptance criteria. **Not in scope** = deliberately pushed later.

---

## CP-0 — Audit, architecture & plan  *(this checkpoint)*
- **Delivered:** branch `b2b-rebuild`, tag `b2c-final`, `docs/{ARCHITECTURE,DATA_MODEL,CHECKPOINTS,REPO_AUDIT}.md`, `prisma/schema.prisma` (53 models, 36 enums), `prisma.config.ts`, `prisma/seed.ts` stub, `.env.example`.
- **Done when:** existing app builds + lints on the branch; `prisma validate` passes; approval received.

## CP-1 — Foundation  *(done — see git log on `b2b-rebuild`)*
**Scope**
- Restructure to route groups + `src/modules` + `src/lib` per ARCHITECTURE §2–3; remove B2C routes/components approved for deletion (REPO_AUDIT).
- Design system: tokens (adapt current palette), `components/ui` primitives (Button, Input, Select, Badge, Card, Modal, Tabs, Table, Pagination, Toast, EmptyState, Skeleton), responsive layout shells for public / dashboard / admin.
- `docker-compose.yml` (Postgres, Redis, Meilisearch, MinIO, Mailpit); first Prisma migration (+ raw-SQL CHECK constraints); `db.ts` singleton; real seed run.
- Auth: email OTP + Google, server sessions, `can()` RBAC, role-aware redirects, `proxy.ts` optimistic guard; buyer registration, supplier registration entry (creates Company in `DRAFT`), admin login page.
- Provider interface skeletons + fakes (`Notifier` logs to Mailpit, `Storage` → MinIO).
- ESLint module-boundary rules; Vitest set up; `t()` i18n helper; error/not-found/loading conventions.
**Done when:** seeded super-admin signs in at `/admin/login` and sees an empty dashboard; buyer and supplier can register/sign in and land on their (stub) panels; unauthorized access to another panel is blocked with tests; `docker compose up` + `npm run db:migrate && npm run db:seed` works from a clean clone.
**Not in scope:** any catalog/search UI.

## CP-2 — Catalog core  *(done)*
**Scope**
- **Taxonomy importer** (`scripts/import-categories`): CSV/JSON of L1–L4 → `Category` (idempotent, computes `path/level/isLeaf`, reports orphans/dupes); run with the real tree when supplied. Seed ≥ L1+L2+main L3.
- Attribute template editor data layer + admin UI (per category, inheritable from parent).
- Supplier panel: Company Info + licence upload (presigned uploads), verification submit; Admin: verification queue (approve/reject, badge grant).
- Product CRUD: category picker → dynamic spec form → price range/tiers, MOQ+unit → media upload (images/video) → submit → moderation queue → publish. Bulk upload via CSV template.
**Done when:** a supplier completes onboarding → admin verifies → supplier lists a product with category-specific specs → admin approves → product row is `LIVE`; importer round-trips a 6,000-leaf fixture in < 60 s; attribute validation rejects bad values server-side.
**Not in scope:** memberships (everyone is Free), search index, showroom.

## CP-3 — Public website  *(done)*
**Scope**
- Home (category mega-menu, banners from `Banner`, recommended products/suppliers, secured-trading strip), category directory, category page (sub-category nav, listing, breadcrumbs), product detail (gallery, tiers, specs, supplier card, related, JSON-LD), supplier list, static/legal/help/blog from `CmsPage`.
- SEO basics: `generateMetadata`, canonical, `sitemap.ts` (sharded), `robots.ts`, JSON-LD `Product/Organization/BreadcrumbList`, A–Z index pages, 404 handling.
- Listing queries served from Postgres (pre-search) behind a `catalog` read API so CP-4 can swap the source.
**Done when:** Lighthouse SEO ≥ 95 and no CLS regressions on home/category/product; structured data passes the Rich Results validator on sample pages; every public page is server-rendered with real content in the HTML; mobile layout verified at 360 px.
**Not in scope:** filters/facets, inquiry buttons (rendered, wired in CP-6).

## CP-4 — Search  *(done)*
**Scope**
- Meilisearch indexes `products`, `suppliers` (+ `secured` as a filtered view of products); indexer worker consuming `product.*`/`supplier.*` events + full reindex command.
- Faceted filters: business type, R&D, sub-category, MOQ, price range, buy-sample, certifications, audited, member tier, province/location, **dynamic per-category attributes** from `AttributeDefinition.isFilterable`.
- Products / Suppliers / Secured Trading tabs; sort (relevance, newest, price); ranking = text relevance + tier `rankBoost` + audited + responsiveness; typo tolerance; suggestions endpoint.
- Filter state ⇄ canonical URL; indexable-combination whitelist; product card component with all required fields.
**Done when:** a filter combination returns correct counts vs. SQL ground-truth in tests; p95 query < 150 ms on 100k seeded products; reindex is idempotent; URL round-trips (copy/paste reproduces results).
**Not in scope:** personalised ranking.

## CP-5 — Showrooms
**Scope**
- Tenant resolver in `proxy.ts` (subdomain → `/s/{slug}` rewrite, reserved-slug list, feature flag); path fallback.
- Pages: Home, Products, Product Groups, Company Profile, Audit Report, Reviews, Contact — generated from supplier data; 2–3 templates.
- Supplier Showroom editor (template, banner, colours, section order, group management) with live preview; slug validation/reservation.
- Canonical/noindex rules, per-showroom sitemap and JSON-LD `Organization`.
**Done when:** `acme.<root>` and `/s/acme` render identical content; cross-tenant data never leaks (tests); editing publishes within 5 s (revalidation); unverified suppliers' showrooms are not public.

## CP-6 — Inquiries
**Scope**
- Send Inquiry from product/supplier pages (rate-limited, validated, attachments); Inquiry Basket (add/remove, one message → many suppliers, cap per send).
- `inquiry.created` → per-supplier `InquiryRecipient` + Conversation + notifications (in-app + email via `Notifier`).
- Supplier Message Center v1: inbox, filters, assign to sub-account, reply templates; Buyer Messages/Inquiries list; Notification centre.
- Response metrics job → `Company.responseRate/responseTimeMins`; shown on cards.
- Supplier sub-accounts (invite, roles).
**Done when:** a buyer sends one inquiry to 5 suppliers from the basket; each supplier sees it once, can assign + reply; metrics update after replies; duplicate submits are idempotent.
**Not in scope:** real-time delivery (polling/refresh until CP-8).

## CP-7 — RFQ
**Scope**
- Public Post Sourcing Request (guest → login interrupt, draft saved); buyer RFQ list/detail.
- Admin RFQ review (approve / edit / reject with reason).
- `rfq.approved` → **match job** (category + ancestors, verified status, tier, keywords) → `SourcingMatch`; supplier "Received Sourcing Requests".
- Quoting with **tier quota** (`MembershipPlan.rfqQuotaMonth`, atomic counter check); Quote Compare view (side-by-side price/MOQ/lead time/supplier trust signals); shortlist/accept; sample-request flow v1 (request → supplier quotes price+freight).
- RFQ expiry job.
**Done when:** quota is enforced under concurrent submits (test); a non-matched supplier cannot quote; buyer sees quotes ranked/compared; expiry closes requests.

## CP-8 — Chat
**Scope**
- Socket.IO `realtime` service + Redis adapter; WS auth via short-lived signed token; rooms per conversation; presence/typing; reconnect + missed-message sync.
- Message types: text, file (presigned), **product / quote / order cards**; read receipts; unread counters.
- Translation (AI provider) with original + translated display toggle; message search within a thread.
- Chat UI shared in buyer, supplier and showroom contexts; offline → notification fallback.
- Upgrade CP-6 inboxes to live.
**Done when:** two browsers exchange messages < 300 ms p95 locally; horizontal scale proven with 2 realtime instances via Redis; no cross-conversation leakage (authz tests); cards deep-link correctly.

## CP-9 — Memberships & trust
**Scope**
- Plans admin; Supplier "Membership & Promotion" page; checkout for plans via `PaymentProvider`; `Subscription`/`Invoice` lifecycle (renew, expire, downgrade) and entitlements (`maxProducts`, sub-accounts, quota).
- Verification & audit workflow (request audit → upload report → pass/fail → badge); badge sync job; Audit Report page data.
- Ranking/promotion admin (boost rules, featured slots) feeding search.
- Reviews: buyer submit (verified-purchase gating once orders exist), supplier reply, admin moderation, rating rollup.
- Supplier analytics v1 (views, inquiries, response, search impressions).
**Done when:** Gold purchase upgrades limits and search rank immediately (event-driven); expiry downgrades automatically; invoices generated; review moderation updates rollups.

## CP-10 — Escrow orders
**Scope**
- Start Order (from product, quote card, sample request, RFQ quote) → Draft → supplier confirmation (Under review) → Awaiting payment.
- Checkout with `PaymentProvider` (Razorpay + Stripe adapters), webhook handling (signature + idempotency), `Payment` records.
- **Escrow ledger**: HOLD on payment, RELEASE/FEE on completion, REFUND; ledger invariants + reconciliation report; auto-release job.
- Production/Inspection/Shipped updates by supplier, `Shipment` tracking, buyer confirm receipt, order timeline UI (buyer, supplier, admin).
- Disputes: open, evidence, supplier response, admin resolution (release / refund / split) with ledger effects.
- Sample orders using the same engine.
**Done when:** full happy path and dispute paths pass automated tests; ledger sum equals expected after every transition (property tests); duplicate webhooks do not double-credit; every transition recorded in `OrderStatusHistory` + `AuditLog`.
**Needs from you before start:** payment/KYC/payout model (see open questions).

## CP-11 — AI & support
**Scope**
- `AIProvider` (Claude): **AI Sourcing Assistant** widget (understands need → suggests categories/products/suppliers via search tool → drafts RFQ), **listing writer** (title/description/specs from basic input), **reply drafts** for suppliers, **auto-moderation** (products, RFQs, messages) with human review queue, translation hardening.
- Support chat: AI-first with knowledge from `CmsPage` help; unresolved → handover creates `SupportTicket` with AI summary → agent queue in Admin Support Desk (assign, reply, close); CSAT.
- Cost/safety: per-user rate limits, token budgets, prompt-injection guards (tool outputs treated as data), logging to `AuditLog`.
**Done when:** assistant eval set (≥ 50 prompts) passes thresholds; handover preserves context; moderation false-negative rate measured on a labelled sample; spend dashboard exists.

## CP-12 — Admin completion, CMS, analytics, hardening, deployment
**Scope**
- Admin: Dashboard, Members, Reviews moderation, Reports (GMV, escrow float, funnel, response rates), Staff & Roles UI, finance views, CMS editor (pages, banners, landing pages), audit-log viewer.
- i18n: locale routing + hreflang, string extraction, RTL check; translated categories.
- Performance: caching strategy (evaluate `cacheComponents`), image optimisation, DB indexes review, load test.
- Security: CSP, rate limits everywhere, admin 2FA, upload AV scanning, dependency audit, pen-test checklist, backups/DR.
- Deployment: Dockerfiles for web/realtime/worker, Azure Central India IaC, CI/CD, observability (Sentry, logs, uptime), runbooks.
**Done when:** security checklist signed off; load test meets targets; staging → production release rehearsed; all panels reachable by role with E2E coverage of the 8 key workflows.

---

## Cross-cutting definitions of done (every CP)
1. Typed, no `any`; Zod on all external input.
2. Authorization tests for every new mutation.
3. Events emitted per ARCHITECTURE §8 for state changes.
4. Docs updated (`ARCHITECTURE`, `DATA_MODEL` deltas, migrations reviewed).
5. Demo script + seed data to show the feature.
