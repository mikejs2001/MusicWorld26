import { useState } from "react";

type Props = {
  id: string;
  alt: string;
  className?: string;
  width?: number;
  quality?: number;
  loading?: "lazy" | "eager";
};

/**
 * Wraps an Unsplash photo id and degrades to a soft branded placeholder
 * (instead of a broken-image icon) if the remote image ever fails to load.
 */
export default function Img({ id, alt, className = "", width = 1200, quality = 75, loading = "lazy" }: Props) {
  const [failed, setFailed] = useState(false);
  const src = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=${quality}`;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-blush via-cream-dim to-rose-light/60 ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-rose-dark/40" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
