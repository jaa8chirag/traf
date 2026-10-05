# Tarf — B2B sourcing marketplace

Next.js 16 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Prisma 7 · Redis · Meilisearch.
Design docs live in [`docs/`](docs): [ARCHITECTURE](docs/ARCHITECTURE.md), [DATA_MODEL](docs/DATA_MODEL.md), [CHECKPOINTS](docs/CHECKPOINTS.md), [REPO_AUDIT](docs/REPO_AUDIT.md).

> This version of Next.js has breaking changes (e.g. `middleware` is now `proxy`). See `AGENTS.md`.

## Quick start

```bash
cp .env.example .env            # and .env.local; set AUTH_SECRET to a random 32+ char string
docker compose up -d            # Postgres :5433, Redis :6380, Meilisearch :7700, MinIO :9000, Mailpit :8025
npm install                     # also runs `prisma generate`
npm run db:migrate              # apply migrations
npm run db:seed                 # categories, attribute templates, plans, roles/permissions, demo suppliers, buyer, super-admin
npm run storage:init            # create the MinIO bucket + make public/* readable
npm run seed:demo               # (optional) ~75 more demo products, 5 more suppliers, specs + certificates
npm run seed:images             # generate product photos + supplier logos for the demo data
npm run search:reindex          # build the Meilisearch indexes from Postgres
npm run dev
npm run worker                  # separate terminal: outbox relay -> BullMQ -> search indexing
```

Sign-in is email + one-time code. In development the code arrives in **Mailpit** at http://localhost:8025.

| Who | Where | Email |
|---|---|---|
| Super-admin | `/admin/login` | `admin@tarf.test` (`SEED_ADMIN_EMAIL`) |
| Demo buyer | `/login` | `buyer@demo.tarf.test` |
| Demo supplier | `/login` (then `/supplier/dashboard`) | `sunrise@demo.tarf.test` |

Google sign-in is enabled when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.

## Category tree import

```bash
npm run taxonomy:import -- tree.csv --dry-run   # validate only
npm run taxonomy:import -- tree.csv --prune     # apply; --prune retires categories not in the file
```

CSV columns `l1,l2,l3,l4` (names; optional translations as `l1_hi`, `l2_zh`, …) or a nested JSON `[{ "name", "nameI18n", "children": [] }]`.
The importer is idempotent, keyed by the slug path, and disambiguates repeated names (e.g. several "Others") by prefixing the parent.

## Search

Meilisearch holds two indexes (`products`, `suppliers`; the Secured Trading tab is a filter on products).
- **Keeping it fresh:** state changes write `OutboxEvent` rows in the same transaction; `npm run worker` relays them to BullMQ and the `search-index` consumer re-syncs the affected product/supplier. Without the worker, new or approved products will not appear in search until `npm run search:reindex`.
- **Rebuild:** `npm run search:reindex` builds a new index and swaps it in atomically (idempotent, no downtime).
- **Filters live in the URL** (`/search?q=…&biz=MANUFACTURER&attr.wattage=65`) with a canonical, sorted form; only a small whitelist of combinations is indexable (see `isIndexable` in `src/modules/search/query.ts`). Category pages (`/c/…`), `/suppliers` and `/secured-trading` share the same filter UI.
- **Dynamic filters** come from `AttributeDefinition.isFilterable` on the selected category (changing one emits `attribute.changed` and the worker re-applies index settings).
- **If the engine is down** the site falls back to a reduced Postgres search (no facets) and shows a notice.
- **Load test:** `npm run search:bench` (100k synthetic products; p95 ≈ 10 ms locally).
- Cross-currency price filters/sorting use placeholder FX rates in `src/lib/fx.ts`.

## Public site notes

- Public pages are server-rendered and ISR-cached (`revalidate` 5–10 min). **`next build` queries the database** (home, directory, A–Z, sitemap are prerendered), so Postgres must be reachable during the build.
- Set `NEXT_PUBLIC_APP_URL` to the real origin before building: it feeds canonical URLs, Open Graph, JSON-LD and the sitemap (it is inlined at build time).
- Sitemaps are sharded at `/sitemap/{id}.xml` (listed in `robots.txt`). Banners and CMS pages (help / legal / blog) are data: see `Banner` and `CmsPage`; seed content is placeholder text that needs real copy and legal review.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` | ESLint (incl. module-boundary rules) · `tsc --noEmit` |
| `npm test` | Vitest (unit + DB integration; needs the compose Postgres, migrated and seeded) |
| `npm run storage:init` / `taxonomy:import` | MinIO bucket setup · category importer |
| `npm run worker` · `search:reindex` · `search:bench` | background worker · rebuild indexes · load test |
| `npm run seed:demo` · `seed:images` | larger demo catalogue · generated demo photos/logos |
| `npm run db:migrate` / `db:seed` / `db:studio` / `db:validate` | Prisma |

## Layout

```
src/app/(auth) (buyer) (supplier) (admin)   route groups, one shell per panel
src/modules/<name>/index.ts                 module public API — import only via the index
src/lib/                                    db, env, i18n t(), tenant resolver, providers/*
src/components/ui                           design-system primitives
src/proxy.ts                                showroom tenant rewrite + optimistic auth redirect
prisma/                                     schema, migrations, seed
```

Rules: UI never imports Prisma; modules are imported only through their index (enforced by ESLint).
