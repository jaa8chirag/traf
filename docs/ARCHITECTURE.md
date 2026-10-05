# Tarf B2B Marketplace — Architecture

Status: **CP-0 draft** (awaiting approval). Scope: website only; no mobile apps.

> **Next.js version note.** This repo is on **Next.js 16.3 / React 19.2**. Per `AGENTS.md`, conventions differ from older versions. The ones that matter here (verified in `node_modules/next/dist/docs`):
> - `middleware.ts` is now **`proxy.ts`** (exported function `proxy`, Node.js runtime by default, `runtime` config not allowed). All "middleware" below means `src/proxy.ts`.
> - Route props use the generated global helpers (`LayoutProps<"/">`, `PageProps<"/path">`) — already used in `src/app/layout.tsx`.
> - Caching/PPR is opt-in through `cacheComponents` — **we do not enable it in CP-1**; revisit in CP-12 (performance).
> - Proxy is for optimistic checks (tenant resolve, cookie presence), **never** the only authorization layer. Authorization is enforced in the service layer.

---

## 1. System shape

One repository, **one Next.js app + two small Node processes**, all sharing the same `src/modules` code and one PostgreSQL database.

```
                   ┌────────────────────────── Azure Central India ──────────────────────────┐
 Browser ──HTTPS──▶│  web     Next.js (App Router, SSR/RSC, route handlers, server actions)  │
        ──WSS────▶ │  realtime Socket.IO server (chat, presence, typing) + Redis adapter     │
                   │  worker  BullMQ consumers (notifications, RFQ match, alerts, indexing…) │
                   │                                                                         │
                   │  PostgreSQL ◀── Prisma        Redis ◀── BullMQ / Socket.IO / rate-limit │
                   │  Meilisearch (search)         S3/Azure Blob (files)                     │
                   └─────────────────────────────────────────────────────────────────────────┘
        external: Razorpay/Stripe · Claude API · SMTP/ACS/SMS/WhatsApp
```

Why not serverless: WebSockets, long-lived BullMQ workers and wildcard subdomains all favour a container/VM deployment (Azure Container Apps or App Service). `next start` + reverse proxy (see `self-hosting.md`) is the target. **Three deployables, one codebase**: `web`, `realtime`, `worker`.

### Why a modular monolith
Fifteen bounded contexts with heavy cross-reads (a product page touches catalog + supplier + billing + reviews). Microservices would add network cost and distributed-transaction pain (escrow!) for no benefit at this stage. Modules are strict about *who may write what*, so a module can be extracted later.

---

## 2. Module boundaries

Code lives in `src/modules/<module>/`. Each module exposes **only** `index.ts` (service functions + types + event names). Other modules import from `@/modules/<name>` — never from its internals, and never write another module's tables.

| Module | Owns (tables) | Responsibility | May call |
|---|---|---|---|
| **identity** | User, Account, Session, OtpCode, Role, Permission, RolePermission, StaffMember, SubAccount, BuyerProfile | Sign-in (OTP/Google), sessions, RBAC (`can(user, perm, scope)`), sub-accounts | — |
| **supplier** | Company, SupplierProfile, CompanyDocument, Certification, AuditReport, Badge, CompanyBadge | Company profile, licence upload, verification workflow, audit, badges | identity |
| **catalog** | Category, AttributeDefinition, Product, ProductAttributeValue, ProductMedia, PriceTier, ProductGroup, Favorite, BrowsingHistory, ProductAlert, Review | Taxonomy, spec templates, product CRUD, moderation state, reviews, user lists | supplier, identity |
| **search** | *(Meilisearch indexes; no tables)* | Index documents, facets, query building, suggestions, keyword landing queries | catalog, supplier (read) |
| **showroom** | *(reads supplier + catalog; config in SupplierProfile)* | Tenant resolution, templates, showroom data assembly | supplier, catalog |
| **inquiry** | Inquiry, InquiryRecipient, InquiryBasketItem | Send/fan-out inquiries, basket, assignment, response metrics | catalog, messaging |
| **rfq** | SourcingRequest, SourcingMatch, Quote, SampleRequest | Post/review/match/quote/compare; sample flow | catalog, billing (quota), trade |
| **messaging** | Conversation, Message | Conversations, messages, cards, translation hooks, support chat transport | identity, ai |
| **trade** | Order, OrderItem, OrderStatusHistory, Payment, EscrowLedgerEntry, Shipment, Dispute | Order state machine, escrow ledger, payments (via `PaymentProvider`), disputes | catalog, billing, notification |
| **billing** | MembershipPlan, Subscription, Invoice | Plans, subscriptions, invoices, quota & rank-boost entitlements | supplier |
| **cms** | CmsPage, Banner | Legal/help/blog/landing pages, banners | — |
| **notification** | Notification | Fan-out to in-app/email/SMS/WhatsApp via `Notifier`; preferences | identity |
| **analytics** | *(OutboxEvent consumers; later a `metrics_daily` table)* | Supplier analytics, response-rate rollups, admin reports | all (read) |
| **ai** | *(none; logs to AuditLog)* | `AIProvider`: sourcing assistant, listing writer, reply drafts, moderation, translation, support bot | catalog, search |
| **admin** | SupportTicket, AuditLog, OutboxEvent | Back-office composition: dashboards, moderation queues, support desk, audit trail. Orchestrates other modules; owns no domain rules | all |

Rules enforced by an ESLint `no-restricted-imports` rule (added in CP-1):
1. `@/modules/*/internal/**` is private to its module.
2. UI (`src/app`, `src/components`) calls module services only — never Prisma directly.
3. Every state-changing service function (a) authorizes, (b) writes inside a `prisma.$transaction`, (c) appends an `OutboxEvent` in that same transaction.
4. `EscrowLedgerEntry` is append-only; only `trade` writes it.

### Folder layout (target after CP-1)

```
src/
  app/                       # routes only — thin
    (public)/                # panel 1
    (auth)/login, register
    (buyer)/buyer/…          # panel 2
    (supplier)/supplier/…    # panel 3
    (showroom)/s/[slug]/…    # panel 4
    (orders)/orders/…, checkout/   # panel 6
    (admin)/admin/…          # panel 7
    api/                     # route handlers: webhooks, uploads, search suggest, health
    sitemap.ts, robots.ts
  proxy.ts                   # tenant resolver, locale, optimistic auth redirect
  modules/<module>/{index.ts, service.ts, schemas.ts, events.ts, internal/…}
  lib/
    db.ts                    # Prisma singleton (adapter-pg)
    auth/                    # session read, can()
    providers/{payment,ai,storage,notifier,search}/   # interfaces + implementations
    events/                  # outbox writer + event registry
    i18n/, seo/ (json-ld helpers), money/, validation/
  components/
    ui/                      # design-system primitives
    layout/, panels/<panel>/ # panel-specific components
  generated/prisma/          # gitignored
realtime/                    # Socket.IO entrypoint (imports src/modules)
workers/                     # BullMQ entrypoint + processors (imports src/modules)
prisma/{schema.prisma, seed.ts, migrations/}
docs/
```

Chat is panel 5 and is **shared**: components in `src/components/panels/chat/` are mounted inside buyer, supplier and showroom layouts; the AI/support widget is mounted in the root layout.

---

## 3. Panels → route groups

| # | Panel | Route group | URL prefix | Auth |
|---|---|---|---|---|
| 1 | Public | `(public)` | `/`, `/categories`, `/c/[...path]`, `/products`, `/p/[slug]`, `/suppliers`, `/secured-trading`, `/sourcing/post`, `/help`, `/legal/[slug]`, `/blog/[slug]`, `/a-z/[letter]` | none |
| 2 | Buyer | `(buyer)` | `/buyer/{dashboard,messages,sourcing,orders,samples,basket,favorites,history,alerts,settings}` | role: buyer |
| 3 | Supplier | `(supplier)` | `/supplier/{dashboard,messages,company,products,showroom,sourcing,orders,membership,verification,analytics,reviews,team}` | SubAccount of a Company |
| 4 | Showroom | `(showroom)` | `/s/[slug]/{,products,groups,about,audit,reviews,contact}` (served at `{slug}.<root>` via proxy rewrite) | none |
| 5 | Chat/support | components + `api/` + `realtime/` | embedded; `/buyer/messages`, `/supplier/messages` full pages | session |
| 6 | Order center | `(orders)` | `/orders`, `/orders/[id]`, `/checkout/[orderId]` | buyer or supplier party to the order |
| 7 | Admin | `(admin)` | `/admin/{dashboard,members,suppliers,categories,products,sourcing,orders,disputes,plans,ranking,cms,support,reviews,reports,staff}` | StaffMember + permission |

Existing B2C routes (`/shop`, `/cart`, `/products/[slug]`, …) are removed in CP-1 (after approval); `/products/[slug]` is replaced by `/p/[slug]` with a redirect period if the URLs were ever indexed.

Panel layouts are separate root-level shells (own `layout.tsx`) so each panel can have a different chrome (public mega-menu vs. dashboard sidebar) without conditional logic. A `(public)` visitor layout and a dashboard shell share only `components/ui`.

---

## 4. Showroom subdomain strategy

**Goal:** `acme-tiles.tarf.example` serves the supplier's showroom; `tarf.example/s/acme-tiles` serves the same content (fallback, and the only mode in local dev / preview deployments).

1. **Wildcard DNS** `*.tarf.example` → the web app; wildcard TLS cert (Azure Front Door / App Gateway or cert-manager DNS-01).
2. **`src/proxy.ts`** reads `Host`:
   - strips `NEXT_PUBLIC_ROOT_DOMAIN`; if the remainder is a single label not in the **reserved list** (`www, app, admin, api, cdn, static, mail, support, docs, status`) → it is a tenant slug;
   - **rewrites** (not redirects) `/{rest}` → `/s/{slug}/{rest}`, adds `x-tenant-slug` request header;
   - `SHOWROOM_SUBDOMAINS_ENABLED=false` disables the host logic entirely (path-only mode).
   - custom domains: if `Host` matches `SupplierProfile.customDomain` (looked up via a small cached map refreshed by a job — proxy must not do slow data fetching), rewrite the same way. *Post-launch; schema is ready.*
3. **Canonical** is always the subdomain URL if the supplier is Gold+ (and subdomains enabled), else `/s/{slug}`; both emit `<link rel="canonical">`. The non-canonical variant is `noindex`.
4. **Slug rules:** lowercase `[a-z0-9-]{3,40}`, unique, immutable after first publish (changing it needs staff approval, old slug kept as redirect — table added in CP-5 if needed), reserved words rejected at signup.
5. **Cookies:** the session cookie is scoped to the apex domain *only for first-party panels*; showrooms are read-only public pages, so they never need the session. Chat/inquiry buttons on a showroom call apex-domain APIs with CORS allow-list. (Avoids cross-subdomain cookie leakage between supplier-controlled content and logins.)
6. **Security:** showroom content is rendered from structured data + sanitized rich text only — suppliers never ship raw HTML/JS, so a subdomain cannot be used for XSS against the apex.

---

## 5. Provider interfaces

All live in `src/lib/providers/<name>/` as `types.ts` (interface), one folder per implementation, and `index.ts` (factory reading env). Business modules depend on the interface only. Each has an in-memory/fake implementation for tests and local dev.

```ts
// payment
interface PaymentProvider {
  createCheckout(input: { orderId: string; amount: Money; buyer: PayerInfo; returnUrl: string }): Promise<{ providerRef: string; clientSecret?: string; redirectUrl?: string }>;
  verifyWebhook(req: { rawBody: string; headers: Headers }): Promise<PaymentEvent>; // signature-checked
  refund(input: { providerRef: string; amount: Money; idempotencyKey: string }): Promise<{ refundRef: string }>;
  payout?(input: PayoutInput): Promise<{ payoutRef: string }>;
}
// ai
interface AIProvider {
  chat(input: { system: string; messages: AiMessage[]; tools?: AiTool[]; maxTokens?: number }): Promise<AiReply>;
  complete<T>(input: { task: AiTask; schema: ZodType<T>; prompt: string }): Promise<T>; // structured output: listing writer, moderation verdict, reply drafts
  translate(input: { text: string; from?: string; to: string }): Promise<string>;
}
// storage
interface StorageProvider {
  presignUpload(input: { key: string; contentType: string; maxBytes: number }): Promise<{ url: string; headers: Record<string, string> }>;
  publicUrl(key: string): string;
  signedGetUrl(key: string, ttlSec: number): Promise<string>; // private docs: licences, audit reports
  delete(key: string): Promise<void>;
}
// notifier
interface Notifier {
  send(msg: { channel: "email" | "sms" | "whatsapp"; to: string; template: string; vars: Record<string, string>; locale: string }): Promise<{ providerRef: string }>;
}
// search
interface SearchProvider {
  upsert(index: SearchIndex, docs: SearchDoc[]): Promise<void>;
  remove(index: SearchIndex, ids: string[]): Promise<void>;
  query(index: SearchIndex, q: SearchQuery): Promise<SearchResult>; // text, filters, facets, sort, pagination
  configure(index: SearchIndex, settings: IndexSettings): Promise<void>;
}
```

Conventions: money is `{ amount: string (decimal), currency }` — never JS floats; every provider call that moves money takes an **idempotency key**; every external call is wrapped with timeout + retry policy in the job layer, not the provider.

**Implemented in CP-4:** `SearchProvider` is now `configure / upsert / remove / query / multiQuery / rebuild` over an engine-neutral filter AST (`FilterClause`); the Meilisearch adapter compiles it. Index-time ranking = text relevance, then a precomputed `rankScore` (tier + audited + reviews). Disjunctive facet counts use extra `multiQuery` calls. Meilisearch 1.54 (the JS client requires a recent server).

**Search engine choice — Meilisearch.** Faceted search over ~100k–1M products with typo tolerance and a tiny ops footprint fits Azure single-node. OpenSearch is only justified once we need geo-distance ranking at scale, per-field analyzers for CJK, or >5M docs; the `SearchProvider` interface keeps that swap contained. Dynamic per-category attributes are indexed as a flat `attrs` map; filterable attributes are registered in `filterableAttributes` by a job whenever an `AttributeDefinition` with `isFilterable` changes.

---

## 6. Authentication & authorization

- **Sign-in:** email + OTP (6 digits, hashed, 10 min TTL, 5 attempts, rate-limited per identifier + IP) and Google OAuth. Server-side sessions: random token in an `HttpOnly; Secure; SameSite=Lax` cookie, SHA-256 hash stored in `Session`. (No JWT for browser auth; a short-lived signed JWT is minted only for the WebSocket handshake.)
- **Identity model:** one `User` for everyone. "Buyer" = has `BuyerProfile`; "Supplier" = member of a `Company` through `SubAccount`; "Staff" = has `StaffMember`. Roles are additive, so a buyer can later become a supplier without a second account.
- **RBAC:** `Permission` keys like `supplier.verify`, `order.release_escrow`, `cms.publish`. Platform roles (`super_admin`, `verification`, `finance`, `support`, `content`) via `StaffMember`; company roles (`supplier_owner`, `supplier_sales`, …) via `SubAccount`. Check is `can(session, "perm", { companyId? })` in the service layer; `proxy.ts` only does a cheap "has session cookie?" redirect.
- **Admin hardening (CP-12):** staff login restricted to OTP + mandatory second factor, optional IP allow-list, all staff actions to `AuditLog`.
- Auth is **built in-house on Prisma** (small surface: OTP, Google, sessions) rather than adopting a framework; keeps RBAC, sub-accounts and Next 16 compatibility under our control. Revisit if Better-Auth/Auth.js support for Next 16 proves clearly better during CP-1 spike.

---

## 7. State machines

Defined as pure transition tables in each module (`modules/trade/order-machine.ts`) and unit-tested; the DB enum only stores state. Every transition writes `OrderStatusHistory` + an `OutboxEvent`.

**Order**
```
DRAFT → UNDER_REVIEW → AWAITING_PAYMENT → PAID_HELD → IN_PRODUCTION → [INSPECTION] → SHIPPED → DELIVERED → COMPLETED
                                              │                                          │            │
                                              └───────────────→ DISPUTED ◀───────────────┴────────────┘
DISPUTED → COMPLETED (release) | REFUNDED          any pre-PAID_HELD → CANCELLED
```
Escrow ledger effects: `PAID_HELD` writes `HOLD`; `COMPLETED` writes `RELEASE` (+`FEE`); `REFUNDED` writes `REFUND`. `DELIVERED` sets `autoReleaseAt = deliveredAt + ESCROW_AUTO_RELEASE_DAYS`; a delayed job completes the order if the buyer neither confirms nor disputes.

Other machines: `CompanyStatus`, `ProductStatus`, `SourcingStatus`, `QuoteStatus`, `SampleStatus`, `DisputeStatus`, `TicketStatus` — each with allowed-transition tables.

---

## 8. Domain events

Transactional **outbox**: the service writes the domain row and an `OutboxEvent` in one transaction. An outbox-relay worker publishes pending rows to BullMQ (`events` queue, fan-out by `type` to per-consumer queues), marking `PUBLISHED`. Consumers are idempotent (keyed by event id).

| Event | Emitted by | Consumers (queue) |
|---|---|---|
| `user.registered` | identity | notification (welcome), analytics |
| `supplier.submitted` | supplier | admin queue counter, notification (staff) |
| `supplier.verified` / `supplier.rejected` | supplier | notification, search (reindex company + products), badge sync |
| `audit.passed` | supplier | badge sync (`audited`), search reindex |
| `product.submitted` | catalog | ai (auto-moderation), notification (staff) |
| `product.approved` / `product.rejected` / `product.updated` | catalog | search (index/remove), alerts matcher, notification |
| `inquiry.created` | inquiry | messaging (create conversations), notification (supplier), analytics |
| `inquiry.responded` | inquiry | analytics (response rate/time rollup) |
| `rfq.submitted` | rfq | notification (staff), ai (pre-screen) |
| `rfq.approved` | rfq | **rfq-match** job → creates `SourcingMatch`, notifies matched suppliers |
| `rfq.quote_submitted` | rfq | notification (buyer), billing (quota counter) |
| `sample.requested` / `sample.quoted` / `sample.paid` | rfq | notification, trade (create sample order) |
| `message.sent` | messaging | realtime fan-out, notification (offline push), translation job |
| `order.created` / `order.confirmed` | trade | notification |
| `order.paid` | trade (payment webhook) | trade (escrow `HOLD`), notification (both), analytics |
| `order.shipped` | trade | notification, trade (schedule tracking poll) |
| `order.delivered` | trade | trade (schedule auto-release), notification |
| `order.completed` | trade | trade (escrow `RELEASE`/`FEE`), review-invite job, analytics |
| `dispute.opened` / `dispute.resolved` | trade | notification, admin queue, trade (escrow `HOLD` freeze / `REFUND` / `RELEASE`) |
| `subscription.started` / `.expiring` / `.expired` | billing | supplier (tier + badge), search (rank boost), notification |
| `review.submitted` / `.approved` | catalog | admin queue, rating rollup, search |
| `support.handover_requested` | ai/messaging | admin (ticket create + agent queue), notification |
| `alert.matched` | search/alerts job | notification |

**Scheduled jobs (BullMQ repeatables):** subscription expiry sweep, escrow auto-release sweep, RFQ expiry, product-alert evaluation, response-rate rollup, search full-reindex, OTP/session cleanup, outbox retry.

---

## 9. Search & SEO architecture

- **Public pages are server components** with `generateMetadata`, JSON-LD (`Product`, `Organization`, `BreadcrumbList`, `ItemList`) per `json-ld.md`, canonical URLs, and `app/sitemap.ts` (sharded: categories, products, suppliers, landing pages — `generateSitemaps`). `robots.ts` blocks `/buyer`, `/supplier`, `/admin`, `/api`, `/checkout`.
- **Keyword landing pages** (`CmsPage.type = LANDING`) bind to a saved search query; **A–Z indexes** at `/a-z/[letter]` list categories/suppliers from DB.
- **Search URL = state.** Filters encode to a canonical, sorted query string (`?q=…&moq_max=500&biz=manufacturer,trading&attr.color=red`) so pages are shareable, cacheable and crawl-controlled (only whitelisted combinations are indexable).
- **i18n-ready (hreflang):** locale as the first path segment (`/en/…`, `/hi/…`) added in CP-12 via `proxy.ts` negotiation; until then all strings go through a `t()` helper from CP-1 so no retrofit is needed. Content translations stored as `nameI18n` JSON (categories) and later a translations table for products.

---

## 10. Security baseline

Zod validation on every route handler/server action input; CSRF via same-site cookies + Origin check on actions; rate limiting (Redis) on OTP, inquiry, RFQ, chat, search suggest; signed, size/type-limited uploads (presigned PUT, AV scan job for documents); private files served by short-lived signed URLs; PII minimization in logs; payment webhooks verified by signature and processed idempotently; CSP with nonce via proxy (`content-security-policy.md`); dependency audit in CI. Details hardened in CP-12.

---

## 11. Local development & CI

`docker-compose.yml` (added in CP-1, *not* in CP-0 because deployment/infra changes need your sign-off) provides Postgres, Redis, Meilisearch, MinIO (S3), Mailpit. CI: `lint`, `typecheck`, `prisma validate`, unit tests (Vitest), `build`. E2E (Playwright) for escrow happy-path and RFQ flow from CP-7 onward.
