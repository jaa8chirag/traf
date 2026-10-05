// Renders the four home-page hero slides (illustrated, no external assets) into public/banners/*.webp.
//   npm run hero:images
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const W = 1600;
const H = 600;

const dots = (color: string): string =>
  Array.from({ length: 14 }, (_, r) => Array.from({ length: 30 }, (_, c) => `<circle cx="${40 + c * 54}" cy="${30 + r * 44}" r="2" fill="${color}" opacity=".07"/>`).join("")).join("");

const frame = (id: string, c1: string, c2: string, body: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <filter id="sh-${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg-${id})"/>
  ${dots("#ffffff")}
  <circle cx="1230" cy="300" r="330" fill="#fff" opacity=".05"/>
  <circle cx="1230" cy="300" r="230" fill="#fff" opacity=".05"/>
  <g filter="url(#sh-${id})">${body}</g>
</svg>`;

const card = (x: number, y: number, w: number, h: number, rot: number, inner: string, fill = "#fbf8f1"): string =>
  `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${fill}"/>${inner}</g>`;

const check = (cx: number, cy: number, r: number, fill = "#1f7a4d"): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/><path d="M${cx - r * 0.45} ${cy + r * 0.02} L${cx - r * 0.1} ${cy + r * 0.38} L${cx + r * 0.5} ${cy - r * 0.34}" fill="none" stroke="#fff" stroke-width="${r * 0.2}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** 1 — verified manufacturers: product cards + verified badge. */
const sourcing = frame("a", "#14231b", "#3f6a52", `
  ${card(880, 150, 220, 270, -8, `
    <rect x="945" y="215" width="90" height="120" rx="20" fill="#2f4a3a"/><rect x="965" y="175" width="12" height="46" rx="5" fill="#1b2b22"/><rect x="1003" y="175" width="12" height="46" rx="5" fill="#1b2b22"/>
    <rect x="968" y="300" width="44" height="14" rx="7" fill="#f4f8ef"/><text x="990" y="272" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="700" fill="#f4f8ef">65W</text>
    <rect x="915" y="372" width="130" height="10" rx="5" fill="#d8d2c2"/><rect x="915" y="392" width="80" height="10" rx="5" fill="#e6e1d3"/>`)}
  ${card(1120, 90, 230, 280, 6, `
    ${[0, 1].flatMap((r) => [0, 1].map((c) => `<rect x="${1160 + c * 76}" y="${130 + r * 76}" width="70" height="70" rx="5" fill="${(r + c) % 2 ? "#b8651b" : "#fff6e3"}" stroke="#6f3a0c" stroke-width="2"/>`)).join("")}
    <rect x="1160" y="296" width="140" height="10" rx="5" fill="#d8d2c2"/><rect x="1160" y="316" width="90" height="10" rx="5" fill="#e6e1d3"/>`)}
  ${card(1010, 330, 240, 200, -3, `
    <path d="M1090 395 C1150 380 1190 420 1170 470 C1150 515 1085 515 1062 470 C1040 430 1050 405 1090 395 Z" fill="#f2a516"/>
    <path d="M1105 390 C1105 372 1115 366 1125 362" stroke="#6f3a0c" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M1122 365 C1150 340 1185 345 1195 360 C1170 380 1140 378 1122 365Z" fill="#3b8f3b"/>
    <rect x="1040" y="500" width="130" height="10" rx="5" fill="#d8d2c2"/>`)}
  ${check(1320, 150, 46)}
  ${check(870, 440, 30, "#2b5d84")}
`);

/** 2 — Secured Trading: buyer -> escrow vault -> supplier. */
const secured = frame("b", "#0f1e33", "#2b5d84", `
  <path d="M1000 170 L1270 170" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>
  <path d="M1000 430 L1270 430" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>
  <path d="M1140 215 C1260 215 1330 300 1250 300" fill="none"/>
  <g transform="translate(1130 300)">
    <path d="M0 -150 L120 -105 L120 15 C120 90 60 135 0 160 C-60 135 -120 90 -120 15 L-120 -105 Z" fill="#fbf8f1"/>
    <path d="M0 -118 L92 -84 L92 12 C92 70 46 106 0 126 C-46 106 -92 70 -92 12 L-92 -84 Z" fill="#2b5d84"/>
    <rect x="-38" y="-18" width="76" height="62" rx="12" fill="#fbf8f1"/>
    <path d="M-22 -18 L-22 -42 C-22 -70 22 -70 22 -42 L22 -18" fill="none" stroke="#fbf8f1" stroke-width="12" stroke-linecap="round"/>
    <circle cx="0" cy="14" r="9" fill="#2b5d84"/><rect x="-3.5" y="16" width="7" height="18" rx="3" fill="#2b5d84"/>
  </g>
  ${card(850, 110, 150, 120, -6, `<circle cx="925" cy="150" r="22" fill="#2b5d84"/><rect x="893" y="182" width="64" height="26" rx="13" fill="#2b5d84"/><text x="925" y="226" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#173a56">BUYER</text>`)}
  ${card(1270, 370, 170, 130, 5, `<rect x="1305" y="398" width="100" height="56" rx="8" fill="#b8651b"/><path d="M1305 398 L1355 374 L1405 398" fill="#6f3a0c"/><text x="1355" y="486" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#6f3a0c">SUPPLIER</text>`)}
  ${[0, 1, 2].map((i) => `<ellipse cx="${1050 + i * 16}" cy="${470 - i * 12}" rx="46" ry="14" fill="#f2b705" stroke="#a27700" stroke-width="3"/>`).join("")}
  ${check(1275, 175, 34)}
`);

/** 3 — audited suppliers: factory + audit badge. */
const audited = frame("c", "#2a1d12", "#a8652a", `
  <g transform="translate(900 120)">
    <rect x="0" y="210" width="440" height="170" rx="10" fill="#fbf8f1"/>
    <path d="M0 210 L0 130 L110 190 L110 130 L220 190 L220 130 L330 190 L330 130 L440 190 L440 210 Z" fill="#e9dcc3"/>
    <rect x="360" y="40" width="46" height="170" rx="6" fill="#d8c7a6"/><rect x="354" y="26" width="58" height="22" rx="6" fill="#b8651b"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${28 + i * 100}" y="250" width="64" height="46" rx="6" fill="#2b5d84" opacity=".85"/>`).join("")}
    <rect x="170" y="318" width="100" height="62" rx="8" fill="#6f3a0c"/>
  </g>
  <g transform="translate(1190 360) rotate(8)">
    <rect x="0" y="0" width="190" height="230" rx="18" fill="#fbf8f1"/><rect x="62" y="-14" width="66" height="28" rx="10" fill="#6f3a0c"/>
    ${[0, 1, 2].map((i) => `<g><rect x="22" y="${48 + i * 56}" width="26" height="26" rx="6" fill="#1f7a4d"/><path d="M28 ${61 + i * 56} L34 ${67 + i * 56} L43 ${54 + i * 56}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="62" y="${54 + i * 56}" width="104" height="12" rx="6" fill="#d8d2c2"/></g>`).join("")}
  </g>
  <g transform="translate(1000 150)"><circle r="62" fill="#fbf8f1"/><circle r="50" fill="#1f7a4d"/>${[0, 1, 2, 3, 4].map((i) => `<path transform="rotate(${i * 72 - 90}) translate(0 -26)" d="M0 -9 L3 -2 L10 -2 L5 3 L7 10 L0 6 L-7 10 L-5 3 L-10 -2 L-3 -2 Z" fill="#ffe08a"/>`).join("")}</g>
`);

/** 4 — sell globally: globe, routes and parcels. */
const global = frame("d", "#24120a", "#c2531b", `
  <g transform="translate(1130 300)">
    <circle r="190" fill="#fbf8f1"/><circle r="190" fill="#2b5d84" opacity=".92"/>
    <g fill="none" stroke="#fbf8f1" stroke-opacity=".55" stroke-width="3"><ellipse rx="190" ry="70"/><ellipse rx="190" ry="140"/><ellipse rx="75" ry="190"/><ellipse rx="140" ry="190"/><path d="M-190 0 H190"/><path d="M0 -190 V190"/></g>
    <path d="M-70 -60 C-30 -110 40 -100 60 -50 C80 -10 40 20 10 40 C-20 60 -80 40 -70 -60Z" fill="#3b8f3b" opacity=".9"/>
    <path d="M70 70 C100 60 130 90 110 120 C90 140 60 120 70 70Z" fill="#3b8f3b" opacity=".9"/>
  </g>
  <path d="M900 470 C960 330 1060 230 1230 150" fill="none" stroke="#ffe08a" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>
  <path d="M1000 120 C1100 60 1240 70 1330 140" fill="none" stroke="#ffe08a" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>
  ${card(820, 430, 150, 130, -8, `<rect x="852" y="462" width="86" height="64" rx="6" fill="#d4a15e"/><rect x="852" y="480" width="86" height="12" fill="#b8793a"/><rect x="887" y="462" width="16" height="64" fill="#b8793a" opacity=".6"/>`)}
  ${card(1330, 100, 140, 120, 8, `<rect x="1360" y="128" width="80" height="58" rx="6" fill="#d4a15e"/><rect x="1360" y="145" width="80" height="11" fill="#b8793a"/><rect x="1392" y="128" width="16" height="58" fill="#b8793a" opacity=".6"/>`)}
  <g transform="translate(1300 440)"><circle r="46" fill="#fbf8f1"/><text y="14" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="800" fill="#c2531b">$</text></g>
`);

async function main(): Promise<void> {
  const dir = join(process.cwd(), "public", "banners");
  mkdirSync(dir, { recursive: true });
  const slides: Array<[string, string]> = [["hero-sourcing", sourcing], ["hero-secured", secured], ["hero-audited", audited], ["hero-global", global]];
  for (const [name, svg] of slides) {
    await sharp(Buffer.from(svg)).resize(1920, 720).webp({ quality: 84 }).toFile(join(dir, `${name}.webp`));
    console.log(`wrote public/banners/${name}.webp`);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
