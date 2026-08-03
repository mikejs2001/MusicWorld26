const items = [
  {
    title: "Certified Artists",
    text: "Every stylist trains continuously in the latest color, cutting, and skincare techniques.",
    icon: "sparkle",
  },
  {
    title: "Clean Formulas",
    text: "Sulfate-free, cruelty-free product lines that are as kind to your skin as they are effective.",
    icon: "leaf",
  },
  {
    title: "Book in Seconds",
    text: "Real-time online booking, instant confirmations, and a 24/7 AI assistant for quick questions.",
    icon: "clock",
  },
  {
    title: "Satisfaction Promise",
    text: "Not loving your result? Come back within 7 days and we'll make it right, on us.",
    icon: "heart",
  },
];

function Icon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", className: "h-5 w-5", fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const;
  switch (name) {
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" strokeLinejoin="round" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M5 19c9 1 14-4 14-14-9 0-14 5-14 14Z" strokeLinejoin="round" />
          <path d="M5 19c2-4 5-7 9-9" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-9.5-9C.7 7.3 3 4 6.5 4c2 0 3.5 1.2 4.5 2.7C12 4 13.5 4 15.5 4 19 4 21.3 7.3 21.5 11 19 15.6 12 20 12 20Z" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function USPs() {
  return (
    <section className="border-y border-line bg-cream-dim">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:py-16 lg:px-8">
        {items.map((item) => (
          <div key={item.title}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blush text-rose-dark">
              <Icon name={item.icon} />
            </div>
            <h3 className="mt-4 font-display text-base text-ink sm:text-lg">{item.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
