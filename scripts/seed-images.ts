// Generates illustrated product photos + supplier logos for the seed data and uploads them to
// object storage (no external image downloads). Idempotent: products that already have media are skipped.
//   npm run seed:images                      (uploads to object storage)
//   DEMO_MEDIA_DIR=public/demo-media npm run seed:images   (writes static files instead)
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";

const bucket = process.env.S3_BUCKET || "tarf-uploads";
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "ap-south-1",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "tarfminio", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "tarfminio123" },
});
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Kind = "charger" | "stand" | "cable" | "bulb" | "tile" | "tshirt" | "mango" | "spice";
interface Palette { bg1: string; bg2: string; main: string; dark: string; light: string }

const PALETTES: Palette[] = [
  { bg1: "#e7efe0", bg2: "#cfdcc4", main: "#2f4a3a", dark: "#1b2b22", light: "#f4f8ef" },
  { bg1: "#f4e9d2", bg2: "#e6d3ac", main: "#b8651b", dark: "#6f3a0c", light: "#fff6e3" },
  { bg1: "#dfe9f0", bg2: "#c3d5e2", main: "#2b5d84", dark: "#173a56", light: "#f1f7fb" },
  { bg1: "#f2dfd8", bg2: "#e6c3b7", main: "#a8402a", dark: "#5e1f12", light: "#fdf1ec" },
];

const shapes: Record<Kind, (p: Palette) => string> = {
  charger: (p) => `
    <rect x="270" y="260" width="260" height="300" rx="46" fill="${p.main}"/>
    <rect x="270" y="260" width="260" height="120" rx="46" fill="${p.light}" opacity=".16"/>
    <rect x="330" y="170" width="26" height="100" rx="8" fill="${p.dark}"/><rect x="444" y="170" width="26" height="100" rx="8" fill="${p.dark}"/>
    <rect x="345" y="470" width="110" height="34" rx="17" fill="${p.dark}"/><rect x="368" y="480" width="64" height="14" rx="7" fill="${p.light}" opacity=".7"/>
    <text x="400" y="430" text-anchor="middle" font-family="sans-serif" font-size="54" font-weight="700" fill="${p.light}">65W</text>`,
  stand: (p) => `
    <path d="M200 560 L600 560 L560 600 L240 600 Z" fill="${p.dark}"/>
    <path d="M300 560 L380 260 L440 276 L380 560 Z" fill="${p.main}"/>
    <rect x="360" y="190" width="190" height="300" rx="26" transform="rotate(12 455 340)" fill="${p.light}" stroke="${p.main}" stroke-width="12"/>
    <rect x="392" y="224" width="126" height="220" rx="12" transform="rotate(12 455 340)" fill="${p.bg2}"/>`,
  cable: (p) => `
    <path d="M180 560 C 260 220, 380 700, 470 380 S 640 240, 620 180" fill="none" stroke="${p.main}" stroke-width="26" stroke-linecap="round"/>
    <rect x="130" y="540" width="100" height="64" rx="14" fill="${p.dark}" transform="rotate(-8 180 572)"/>
    <rect x="590" y="130" width="100" height="64" rx="14" fill="${p.dark}" transform="rotate(-24 640 162)"/>
    <rect x="610" y="150" width="60" height="24" rx="10" fill="${p.light}" opacity=".8" transform="rotate(-24 640 162)"/>`,
  bulb: (p) => `
    <circle cx="400" cy="340" r="150" fill="${p.light}" stroke="${p.main}" stroke-width="10"/>
    <circle cx="400" cy="340" r="150" fill="#ffd54a" opacity=".55"/>
    <path d="M350 400 L370 300 L400 350 L430 300 L450 400" fill="none" stroke="${p.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="335" y="480" width="130" height="34" rx="8" fill="${p.main}"/><rect x="345" y="520" width="110" height="30" rx="8" fill="${p.dark}"/><rect x="365" y="556" width="70" height="26" rx="12" fill="${p.main}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="400" y1="340" x2="400" y2="340" stroke="none"/><rect x="394" y="130" width="12" height="40" rx="6" fill="#ffb300" transform="rotate(${a} 400 340)" opacity=".75"/>`).join("")}`,
  tile: (p) => `
    ${[0, 1].flatMap((r) => [0, 1].map((c) => `<rect x="${230 + c * 170}" y="${200 + r * 170}" width="160" height="160" rx="6" fill="${(r + c) % 2 ? p.main : p.light}" stroke="${p.dark}" stroke-width="3"/>
      <path d="M${230 + c * 170} ${200 + r * 170 + 160} L${230 + c * 170 + 160} ${200 + r * 170}" stroke="${p.dark}" stroke-opacity=".18" stroke-width="2"/>
      <circle cx="${310 + c * 170}" cy="${280 + r * 170}" r="38" fill="none" stroke="${(r + c) % 2 ? p.light : p.main}" stroke-opacity=".5" stroke-width="5"/>`)).join("")}`,
  tshirt: (p) => `
    <path d="M300 190 L220 250 L270 330 L320 300 L320 580 L480 580 L480 300 L530 330 L580 250 L500 190 C 470 230 330 230 300 190 Z" fill="${p.main}" stroke="${p.dark}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M300 190 C 330 240 470 240 500 190" fill="none" stroke="${p.dark}" stroke-width="10"/>
    <rect x="360" y="380" width="80" height="60" rx="10" fill="${p.light}" opacity=".25"/>`,
  mango: (p) => `
    <path d="M400 210 C 560 190 640 340 590 470 C 540 600 330 620 250 500 C 170 380 260 230 400 210 Z" fill="#f2a516"/>
    <path d="M400 210 C 560 190 640 340 590 470 C 540 600 470 560 470 470 C 470 350 440 260 400 210 Z" fill="#e0541b" opacity=".55"/>
    <path d="M400 210 C 400 170 420 150 450 140" fill="none" stroke="${p.dark}" stroke-width="10" stroke-linecap="round"/>
    <path d="M440 150 C 500 90 580 110 600 150 C 540 190 480 180 440 150 Z" fill="#3b8f3b"/>`,
  spice: (p) => `
    <path d="M200 380 L600 380 C 600 560 500 620 400 620 C 300 620 200 560 200 380 Z" fill="${p.main}"/>
    <ellipse cx="400" cy="380" rx="200" ry="44" fill="${p.dark}"/>
    <ellipse cx="400" cy="372" rx="180" ry="34" fill="#c68b3f"/>
    ${Array.from({ length: 46 }, (_, i) => { const a = i * 2.4, r = 20 + ((i * 37) % 150); return `<ellipse cx="${400 + Math.cos(a) * r}" cy="${372 + Math.sin(a) * r * 0.18}" rx="9" ry="3.5" fill="#8a5a1a" transform="rotate(${(i * 47) % 180} ${400 + Math.cos(a) * r} ${372 + Math.sin(a) * r * 0.18})"/>`; }).join("")}`,
};

/** variant 0 = hero shot, 1 = alternate colourway, 2 = close-up on a darker backdrop. */
function scene(kind: Kind, variant: number, seed: number): string {
  const p = PALETTES[(seed + variant) % PALETTES.length];
  const zoom = variant === 2 ? 1.35 : 1;
  const tx = 400 - 400 * zoom, ty = 380 - 380 * zoom;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs><radialGradient id="bg" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></radialGradient></defs>
    <rect width="800" height="800" fill="url(#bg)"/>
    <ellipse cx="400" cy="640" rx="${230 * zoom}" ry="26" fill="#000" opacity=".12"/>
    <g transform="translate(${tx} ${ty}) scale(${zoom})">${shapes[kind](p)}</g>
  </svg>`;
}

function logoSvg(name: string, seed: number): string {
  const p = PALETTES[seed % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="${p.main}"/>
    <text x="128" y="172" text-anchor="middle" font-family="sans-serif" font-size="140" font-weight="700" fill="${p.light}">${name.slice(0, 1).toUpperCase()}</text></svg>`;
}

const KIND_BY_CATEGORY: Record<string, Kind> = {
  chargers: "charger", "phone-stands": "stand", cables: "cable", "led-bulbs": "bulb", "ceramic-tiles": "tile",
  "vitrified-tiles": "tile", "t-shirts": "tshirt", "fresh-fruit": "mango", "spices-and-condiments": "spice",
};

/** DEMO_MEDIA_DIR=public/demo-media writes files instead of uploading (static demo hosting, no S3 needed). */
async function put(key: string, body: Buffer, contentType: string): Promise<void> {
  if (process.env.DEMO_MEDIA_DIR) {
    const file = join(process.env.DEMO_MEDIA_DIR, key);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    return;
  }
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

async function main(): Promise<void> {
  const products = await db.product.findMany({
    where: { status: "LIVE", media: { none: {} } },
    include: { category: { select: { slug: true } } },
  });
  let n = 0;
  for (const [i, p] of products.entries()) {
    const base = p.category.slug.replace(/--retired-.*$/, "");
    const kind = KIND_BY_CATEGORY[base];
    if (!kind) continue;
    for (let v = 0; v < 3; v++) {
      const webp = await sharp(Buffer.from(scene(kind, v, i))).webp({ quality: 82 }).toBuffer();
      const key = `public/products/${p.companyId}/seed-${p.slug.slice(-40)}-${v + 1}.webp`;
      await put(key, webp, "image/webp");
      await db.productMedia.create({ data: { productId: p.id, type: "IMAGE", url: key, sortOrder: v, alt: p.title } });
      n++;
    }
  }

  const companies = await db.company.findMany({ where: { status: "VERIFIED", logoUrl: null } });
  for (const [i, c] of companies.entries()) {
    const key = `public/logos/${c.id}/seed-logo.png`;
    await put(key, await sharp(Buffer.from(logoSvg(c.name, i))).png().toBuffer(), "image/png");
    await db.company.update({ where: { id: c.id }, data: { logoUrl: key } });
  }
  console.log(`Uploaded ${n} product images for ${products.length} products and ${companies.length} logos.`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
