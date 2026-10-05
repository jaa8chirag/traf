# Tarf Data Model (CP-0 draft)

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL, Prisma 7, validated; **not migrated**). This page explains *why* each table exists and how they connect.

Conventions
- IDs are `cuid()` strings. Money is `Decimal(14,2)` + an explicit `currency` column; never floats.
- "Soft ref" = a plain `String` column pointing at a `User` (usually staff) without an FK, to keep reviewer/actor history even if the user is later deleted. The `AuditLog` is the authoritative history for those actions.
- State machines are enums; transition rules live in code (`modules/*/…-machine.ts`) and are unit-tested.
- Denormalised counters (`Company.ratingAvg`, `responseRate`, `tier`, …) are written **only by jobs/services**, so list pages and search don't need joins.

## ER summary

```
                         ┌───────────── identity ─────────────┐
 Role─<RolePermission>─Permission                             │
  │ │                                                          │
  │ └─<StaffMember>─User─<Account/Session>                     │
  └──<SubAccount>──┘ │ └─BuyerProfile                         │
          │          │                                         │
          ▼          ▼ owner                                   │
        Company ─── SupplierProfile  (1:1 showroom config)     │
   │ │ │ │ │ └─ CompanyDocument / Certification / AuditReport / CompanyBadge─Badge
   │ │ │ │ └──── Subscription─MembershipPlan, Invoice          │
   │ │ │ └────── ProductGroup                                  │
   │ │ └──────── Product ─ ProductAttributeValue ─ AttributeDefinition ─ Category (tree)
   │ │              ├─ ProductMedia, PriceTier, Certification  │
   │ │              └─ Favorite / BrowsingHistory / ProductAlert / Review
   │ │
   │ └── Inquiry(buyer) ─< InquiryRecipient >─ Company ; InquiryBasketItem(buyer, product)
   │      InquiryRecipient ─ Conversation ─< Message
   ├──── SourcingRequest(buyer, category) ─< SourcingMatch >─ Company
   │             └─< Quote >─ Company            SampleRequest(buyer, company, product)
   └──── Order(buyer, company, [quote|sample|conversation])
            ├─< OrderItem            ├─< OrderStatusHistory
            ├─< Payment ─< EscrowLedgerEntry (append-only)
            ├─< Shipment             └─< Dispute
 Cross-cutting: Notification, SupportTicket, AuditLog, OutboxEvent, CmsPage, Banner
```

## Tables and why they exist

### Identity
| Table | Why |
|---|---|
| **User** | Single account for every actor (visitor-turned-buyer, supplier staff, admin). Roles are *derived* from related rows, so "buyer becomes supplier" needs no second account. |
| **Account** | Links Google OAuth identities to a User (many providers per user). |
| **Session** | Server-side sessions (hashed token) → instant revocation, device list, no JWT-in-browser risks. |
| **OtpCode** | Email/phone one-time codes with attempt counter and expiry (login + verification), hashed. |
| **Role / Permission / RolePermission** | Data-driven RBAC. `Role.scope` splits platform roles (verification, finance, support, content, super-admin) from company roles (owner, sales, product manager). |
| **StaffMember** | Marks a User as platform ops staff and assigns their admin role → gates `/admin`. |
| **SubAccount** | A User's membership in a supplier Company with a company-scoped role. Inquiries and conversations are *assigned* to SubAccounts. |
| **BuyerProfile** | Buyer-specific attributes (company, country, interests) used for recommendations and RFQ context. |

### Supplier
| Table | Why |
|---|---|
| **Company** | The legal/trading entity: slug (showroom key), business type, R&D flags, location, verification status, plus denormalised tier/audited/rating/response metrics used by listing cards and ranking. |
| **SupplierProfile** | Supplier-only marketplace data and **showroom configuration** (template, JSON config, custom domain). Split from Company so a buyer-owned company stays lightweight. |
| **CompanyDocument** | Uploaded licences/registrations with per-document review state — the evidence behind onboarding step 2→3 ("admin verifies"). |
| **Certification** | ISO/CE/RoHS etc. at company *or* product level (`productId` nullable); shown as card badges and a search filter. |
| **AuditReport** | Optional third-party factory audit; drives the "Audited" badge and the showroom Audit Report page. |
| **Badge / CompanyBadge** | Catalogue of trust badges and their grants with optional expiry (verified, audited, gold, diamond, top-responder). |

### Catalog
| Table | Why |
|---|---|
| **Category** | 4-level tree (L1–L4, ≈6,000 leaves) using adjacency list + materialised `path` for cheap breadcrumb/subtree queries; `nameI18n` for translations; SEO fields for category landing pages. |
| **AttributeDefinition** | Per-category spec template (type, unit, options, required, **filterable**). Powers the product form *and* dynamic search facets. |
| **Product** | The listing: price range, MOQ + unit, lead time, sample/escrow flags, rating/tag, moderation status. `supportsEscrow` feeds the "Secured Trading" tab. |
| **ProductAttributeValue** | Typed values for the category's attributes (`valueText/Number/Bool/Json`) with indexes for filtering and for index-building. EAV is chosen deliberately: ≈6,000 leaf categories make per-category columns impossible. |
| **ProductMedia** | Images/videos/docs, ordered; `Product.hasVideo` is a denormalised flag for cards. |
| **PriceTier** | Quantity break pricing (min–max qty → unit price) for product pages and order calculation. |
| **ProductGroup** | Supplier-defined groups for the showroom "Product Groups" page. |

### Billing
| Table | Why |
|---|---|
| **MembershipPlan** | Free / Gold / Diamond entitlements: max products, sub-accounts, **monthly RFQ-quote quota**, rank boost. Data-driven so admin can edit plans. |
| **Subscription** | A company's plan period (status, start/end, auto-renew); expiry job downgrades `Company.tier`. |
| **Invoice** | Billing records for memberships (GST/tax split, PDF). |

### Inquiry
| Table | Why |
|---|---|
| **Inquiry** | One buyer message (optionally about a product). |
| **InquiryRecipient** | One row per supplier receiving it — gives the **one-message-to-many** Inquiry Basket, per-supplier status, assignment, and `firstRespondedAt` for response rate/time. Links to the Conversation where the thread continues. |
| **InquiryBasketItem** | The buyer's basket before sending (unique per buyer+product). |

### RFQ / Samples
| Table | Why |
|---|---|
| **SourcingRequest** | Buyer's RFQ with admin review state, expiry and category (the matching key). |
| **SourcingMatch** | Output of the auto-match job: which suppliers may see/quote, with a score; supplier's "Received Sourcing Requests" list reads this. |
| **Quote** | Supplier's response (price, MOQ, lead time, validity). `@@unique([requestId, companyId])` = one live quote per supplier; `(companyId, createdAt)` index counts the monthly **quota**. Can be referenced by an Order. |
| **SampleRequest** | Request → supplier confirms price/freight → pay → track; can generate an Order (`Order.sampleRequestId`). |

### Messaging
| Table | Why |
|---|---|
| **Conversation** | Buyer↔supplier thread (or buyer↔support). Optional product context, assigned SubAccount. |
| **Message** | Typed messages (text/file/product/quote/order card/system), `payload` JSON for cards (chat-to-order), per-language `translations`, `isAi` for bot messages, read receipts. |

### Trade / Escrow
| Table | Why |
|---|---|
| **Order / OrderItem** | Escrow order with the 12-state `OrderStatus`; item rows **snapshot** title/price/specs so later product edits never change a placed order. Links back to the quote, sample request or chat that originated it. |
| **OrderStatusHistory** | Immutable transition log (who/when/why) — required for disputes and finance audits. |
| **Payment** | One provider attempt (Razorpay/Stripe/manual); unique `(provider, providerRef)` makes webhook handling idempotent. |
| **EscrowLedgerEntry** | **Append-only** ledger (HOLD / RELEASE / REFUND / FEE / PAYOUT) with a unique `idempotencyKey`. Escrow balance = sum of entries; never an updatable "balance" column. |
| **Shipment** | Carrier, tracking number, event timeline, delivery proof. |
| **Dispute** | Refund/dispute workflow with evidence, resolution type and refund amount; moves the order to `DISPUTED` and freezes release. |

### Engagement
| Table | Why |
|---|---|
| **Review** | Buyer review of a supplier/product, "verified purchase" when `orderId` set, supplier reply, moderation state. Feeds rating rollups and the showroom Reviews page. |
| **Favorite** | Saved products *or* suppliers (exactly one target, enforced in service). |
| **BrowsingHistory** | Recently viewed products (also recommendation input). Pruned by a retention job. |
| **ProductAlert** | Saved-search / keyword / watch alerts evaluated by the alerts job. |
| **Notification** | In-app inbox + delivery record per channel; deep-link payload. |

### CMS / Ops
| Table | Why |
|---|---|
| **CmsPage** | Legal, help, blog and keyword landing pages per locale. |
| **Banner** | Placement-based banners with scheduling for home/category/secured-trading. |
| **SupportTicket** | Human-handover tickets from the AI support chat, with AI summary. |
| **AuditLog** | Who changed what (before/after) for every staff and finance-sensitive action. |
| **OutboxEvent** | Transactional outbox for domain events → BullMQ (see ARCHITECTURE §8). Guarantees an event exists iff its state change committed. |

## Items intentionally deferred (flagged, not forgotten)
- **Slug redirects** table for renamed showrooms (CP-5).
- **Translations** table for product/company content (CP-12; categories already have `nameI18n`).
- **Payout/Settlement** batches and supplier bank details (CP-10 — needs finance input; `PAYOUT` ledger type is reserved).
- **Shipping address book**, **Saved searches** beyond alerts, **Messaging read-state per participant** for group threads (single buyer/company threads only for now).
- **Search denormalisation**: Meilisearch documents are built from these tables by the indexer; nothing about search state is stored in Postgres.
- Postgres-level `CHECK` constraints (rating 1–5, exactly-one-target for `Favorite`, `priceMin ≤ priceMax`) are added in the first migration as raw SQL, since Prisma cannot express them.
