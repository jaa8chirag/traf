import type { Tone, VisualKind } from "@/data/catalog";

const bg: Record<Tone, [string, string]> = {
  sage: ["#e4ecdc", "#cfdcc4"],
  sand: ["#f1e6d1", "#e4d3b3"],
  sky: ["#e0eaef", "#c9d9e1"],
  blush: ["#f4e0d8", "#e7c8bc"],
  ink: ["#2a332d", "#161c18"],
};

// Stylised product illustrations stand in for real photography until the
// asset pipeline (brief §24) delivers editorial shots.
export function ProductVisual({
  kind,
  tone,
  className = "",
}: {
  kind: VisualKind;
  tone: Tone;
  className?: string;
}) {
  const id = `${kind}-${tone}`;
  const [a, b] = bg[tone];
  const dark = tone === "ink";
  const metal = dark ? ["#8b958d", "#5b655d"] : ["#f7f7f5", "#b9bdb8"];
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label={`${kind} illustration`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <linearGradient id={`m-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal[0]} />
          <stop offset="1" stopColor={metal[1]} />
        </linearGradient>
        <linearGradient id={`d-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3430" />
          <stop offset="1" stopColor="#111613" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff5a1f" stopOpacity=".55" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <filter id={`sh-${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#000" floodOpacity=".22" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#bg-${id})`} />
      <ellipse cx="200" cy="330" rx="140" ry="16" fill="#000" opacity=".12" />

      {kind === "stand" && (
        <g filter={`url(#sh-${id})`}>
          <path d="M120 300 L160 190 H240 L280 300" fill="none" stroke={`url(#m-${id})`} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M104 306 H296" stroke={`url(#m-${id})`} strokeWidth="14" strokeLinecap="round" />
          <path d="M92 196 L300 150 L318 176 L112 224 Z" fill={`url(#d-${id})`} />
          <rect x="108" y="64" width="190" height="112" rx="8" transform="rotate(-9 108 176)" fill={`url(#m-${id})`} />
          <rect x="116" y="72" width="174" height="96" rx="4" transform="rotate(-9 116 168)" fill="#18201b" />
          <rect x="140" y="92" width="60" height="6" rx="3" transform="rotate(-9 140 98)" fill="#ff5a1f" />
          <rect x="140" y="108" width="100" height="4" rx="2" transform="rotate(-9 140 112)" fill="#fff" opacity=".35" />
          <rect x="140" y="120" width="80" height="4" rx="2" transform="rotate(-9 140 124)" fill="#fff" opacity=".2" />
        </g>
      )}

      {kind === "holder" && (
        <g filter={`url(#sh-${id})`}>
          <rect x="150" y="296" width="100" height="16" rx="8" fill={`url(#m-${id})`} />
          <path d="M200 296 C 200 240, 150 230, 190 170 S 240 120, 232 96" fill="none" stroke="#2b3430" strokeWidth="12" strokeLinecap="round" />
          <g transform="rotate(8 232 96)">
            <rect x="188" y="14" width="88" height="150" rx="16" fill={`url(#d-${id})`} />
            <rect x="194" y="22" width="76" height="134" rx="10" fill="#ff5a1f" opacity=".92" />
            <rect x="206" y="40" width="30" height="30" rx="8" fill="#fff" opacity=".35" />
            <rect x="206" y="80" width="52" height="5" rx="2.5" fill="#fff" opacity=".6" />
            <rect x="206" y="92" width="40" height="5" rx="2.5" fill="#fff" opacity=".4" />
          </g>
        </g>
      )}

      {kind === "privacy" && (
        <g filter={`url(#sh-${id})`}>
          <rect x="70" y="80" width="260" height="170" rx="12" fill={`url(#d-${id})`} />
          <rect x="80" y="90" width="240" height="150" rx="6" fill="#0e1311" />
          <path d="M80 240 L190 90 H230 L120 240 Z" fill="#fff" opacity=".08" />
          <path d="M170 240 L280 90 H300 L190 240 Z" fill="#fff" opacity=".05" />
          <rect x="100" y="112" width="90" height="8" rx="4" fill="#ff5a1f" />
          <rect x="100" y="132" width="160" height="5" rx="2.5" fill="#fff" opacity=".35" />
          <rect x="100" y="146" width="130" height="5" rx="2.5" fill="#fff" opacity=".25" />
          <path d="M175 250 h50 l10 40 h-70 z" fill={`url(#m-${id})`} />
          <rect x="140" y="288" width="120" height="10" rx="5" fill={`url(#m-${id})`} />
        </g>
      )}

      {kind === "cable" && (
        <g filter={`url(#sh-${id})`}>
          <rect x="90" y="150" width="220" height="140" rx="22" fill={`url(#m-${id})`} />
          <rect x="90" y="150" width="220" height="38" rx="19" fill="#fff" opacity=".5" />
          <rect x="120" y="160" width="160" height="12" rx="6" fill="#18201b" />
          <path d="M130 160 C 120 100, 160 90, 170 60" fill="none" stroke="#ff5a1f" strokeWidth="7" strokeLinecap="round" />
          <path d="M200 160 C 210 110, 250 100, 262 70" fill="none" stroke="#2b3430" strokeWidth="7" strokeLinecap="round" />
          <path d="M250 160 C 260 120, 300 120, 310 96" fill="none" stroke="#2b3430" strokeWidth="7" strokeLinecap="round" opacity=".6" />
          <rect x="130" y="222" width="140" height="6" rx="3" fill="#18201b" opacity=".18" />
        </g>
      )}

      {kind === "charger" && (
        <g filter={`url(#sh-${id})`}>
          <rect x="140" y="130" width="120" height="140" rx="26" fill={`url(#m-${id})`} />
          <rect x="140" y="130" width="120" height="140" rx="26" fill="none" stroke="#fff" strokeOpacity=".25" />
          <rect x="172" y="96" width="14" height="34" rx="3" fill="#cfd3cd" />
          <rect x="214" y="96" width="14" height="34" rx="3" fill="#cfd3cd" />
          <rect x="166" y="178" width="68" height="16" rx="8" fill="#0e1311" />
          <rect x="166" y="206" width="68" height="16" rx="8" fill="#0e1311" />
          <circle cx="226" cy="250" r="5" fill="#ff5a1f" />
          <path d="M200 270 C 200 330, 300 320, 310 350" fill="none" stroke="#ff5a1f" strokeWidth="8" strokeLinecap="round" />
        </g>
      )}

      {kind === "lamp" && (
        <g filter={`url(#sh-${id})`}>
          <ellipse cx="170" cy="150" rx="110" ry="80" fill={`url(#glow-${id})`} />
          <rect x="120" y="300" width="110" height="14" rx="7" fill="#2b3430" />
          <path d="M175 300 L150 180 L240 110" fill="none" stroke="#2b3430" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="150" cy="180" r="9" fill="#ff5a1f" />
          <g transform="rotate(32 240 110)">
            <path d="M200 96 H290 L274 130 H216 Z" fill={`url(#d-${id})`} />
            <rect x="214" y="128" width="62" height="6" rx="3" fill="#ffd9a8" />
          </g>
          <path d="M215 160 L300 200 L170 270 Z" fill="#ffd9a8" opacity=".22" />
        </g>
      )}
    </svg>
  );
}
