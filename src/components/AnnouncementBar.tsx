const items = [
  "Curated everyday products, clearly explained",
  "Specs, compatibility & what's in the box — before you buy",
  "Clear delivery estimates at checkout",
  "Help is one click away",
];

export function AnnouncementBar() {
  return (
    <div className="bg-ink text-paper text-[13px] overflow-hidden" role="region" aria-label="Announcements">
      <div className="marquee flex w-max gap-12 py-2.5 whitespace-nowrap">
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-12" aria-hidden={i >= items.length}>
            {t}
            <span className="w-1 h-1 rounded-full bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}
