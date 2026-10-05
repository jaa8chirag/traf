# Putting the Tarf UI online on Vercel (client preview)

Vercel hosts only the Next.js app. The app also needs a **database, a search engine and file storage**, which you create once (all have free/trial tiers). About 30–40 minutes the first time.

| What | Why | Suggested service | Cost for a demo |
|---|---|---|---|
| PostgreSQL | all data; **`next build` reads it too** | [Neon](https://neon.tech) | free |
| Search | search, filters, suggestions | [Meilisearch Cloud](https://www.meilisearch.com/cloud) | 14-day trial, then paid |
| File storage | product photos, logos | [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible) | free tier |
| Email (optional) | sign-in codes | skip: use **demo sign-in** below | – |

Not needed for a UI demo: Redis, the background worker (`npm run worker`). Without the worker, products you approve later will not appear in search until you run `search:reindex` again; the seeded demo data is unaffected.

---

## 1. Create the services

**Neon:** new project → region closest to Mumbai (Singapore/Mumbai) → copy the **pooled** connection string (host contains `-pooler`), ending in `?sslmode=require`. This is `DATABASE_URL`.

**Cloudflare R2:** create bucket `tarf-uploads` → *Settings → Public access → Allow* the **r2.dev subdomain** → note the URL `https://pub-xxxxxxxx.r2.dev` (`NEXT_PUBLIC_CDN_URL`). *R2 → Manage API tokens → Create* with **Object Read & Write** → note Access Key ID and Secret, and your Account ID. Endpoint = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
> r2.dev makes the **whole bucket public**, including `private/` (supplier licences). Fine for a demo with fake data. Before real suppliers upload documents, use a custom domain that exposes only `public/*` (or split buckets).

**Meilisearch Cloud:** create a project → copy the **host URL** and the **admin/master API key**.

## 2. Load the demo data (once, from your computer)

Run in the project folder, with the values from step 1. (PowerShell: use `$env:NAME="value"`; bash: `export NAME=value`.)

```bash
# database: tables + demo data
export DATABASE_URL="postgresql://…-pooler…neon.tech/neondb?sslmode=require"
npx prisma migrate deploy
npm run db:seed
npm run seed:demo

# photos + logos into R2
export S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
export S3_REGION="auto"  S3_BUCKET="tarf-uploads"  S3_FORCE_PATH_STYLE=true
export S3_ACCESS_KEY_ID="…"  S3_SECRET_ACCESS_KEY="…"
npm run seed:images

# search index
export MEILISEARCH_HOST="https://ms-….meilisearch.io"  MEILISEARCH_MASTER_KEY="…"
export MEILISEARCH_INDEX_PREFIX="tarf_prod_"
npm run search:reindex
```

Variables already set in your shell win over the local `.env`, so this never touches your local database.

## 3. Create the Vercel project

1. vercel.com → **Add New → Project** → import `jaa8chirag/traf`.
2. **Settings → Git → Production Branch = `b2b-rebuild`** (so the main URL shows the new site **without** touching `main`).
3. **Settings → Environment Variables** (tick *Production* and *Preview*):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `AUTH_SECRET` | any random 32+ characters (e.g. from `openssl rand -base64 32`) |
| `MEILISEARCH_HOST` / `MEILISEARCH_MASTER_KEY` | from Meilisearch Cloud |
| `MEILISEARCH_INDEX_PREFIX` | `tarf_prod_` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | as above (`auto`, `tarf-uploads`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 token |
| `S3_FORCE_PATH_STYLE` | `true` |
| `NEXT_PUBLIC_CDN_URL` | `https://pub-xxxxxxxx.r2.dev` (**needed at build time** for images) |
| `DEMO_LOGIN_CODE` | optional, see below (6+ characters) |

`NEXT_PUBLIC_APP_URL` is **not** required: the app uses Vercel's own URL for canonical links, sitemaps and Open Graph. Set it only if you add a custom domain.

4. **Deploy.** (`vercel.json` pins the functions to Mumbai.)

## 4. Letting the client log in without email (demo sign-in)

Set `DEMO_LOGIN_CODE` (e.g. `482913`) and redeploy. Then these accounts sign in with **that code instead of an emailed one**:

| Role | Page | Email |
|---|---|---|
| Buyer | `/login` | `buyer@demo.tarf.test` |
| Supplier | `/login` | `sunrise@demo.tarf.test` |
| Admin | `/admin/login` | `admin@tarf.test` |

Share the code privately. **Anyone who has the URL and the code gets in, including the admin panel**, so keep it to the demo, use fake data only, and delete `DEMO_LOGIN_CODE` afterwards. Other emails still need a real emailed code (configure SMTP such as Resend when you are ready).

## 5. Known limits of this setup
- Supplier uploads from the browser need an **R2 CORS rule** allowing `PUT` from your site's origin (not needed just to view the UI).
- No real email: only demo sign-in works until SMTP is configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`).
- No background worker: new/approved products are not indexed until `search:reindex` (or the worker runs on a separate host such as Railway/Render).
- Sample legal/help text is placeholder copy.

## Troubleshooting
- **Build fails with a Prisma/connection error** → `DATABASE_URL` missing/wrong for the *Production/Preview* environment, or step 2 not run (tables missing).
- **Images broken** → `NEXT_PUBLIC_CDN_URL` not set before the build; set it and redeploy. Also check R2 public access is enabled.
- **"Advanced search is temporarily unavailable"** banner → Meilisearch variables wrong or `search:reindex` not run.
- **Login says code invalid** → `DEMO_LOGIN_CODE` not set in this environment (Production vs Preview), or the email is not in the demo list.
