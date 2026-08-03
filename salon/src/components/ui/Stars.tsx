export default function Stars({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 text-gold ${className}`} aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill={i < count ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1">
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}
