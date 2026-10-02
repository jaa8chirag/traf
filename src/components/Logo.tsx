export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label="Tarf">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--accent)" />
        <path d="M9 10h14M16 10v13" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="23" cy="21.5" r="2" fill="white" />
      </svg>
      <span className={`font-display text-[26px] leading-none font-semibold ${light ? "text-paper" : "text-ink"}`}>
        tarf
      </span>
    </span>
  );
}
