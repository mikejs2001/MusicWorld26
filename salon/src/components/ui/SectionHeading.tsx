type Props = {
  eyebrow?: string;
  title: string;
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export default function SectionHeading({ eyebrow, title, align = "left", invert = false, className = "", children }: Props) {
  const isCenter = align === "center";
  return (
    <div className={`${isCenter ? "mx-auto text-center" : "text-left"} max-w-2xl ${className}`}>
      {eyebrow && (
        <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.2em] ${invert ? "text-gold-light" : "text-rose-dark"}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`text-balance font-display text-3xl leading-[1.1] sm:text-4xl ${invert ? "text-cream" : "text-ink"}`}>
        {title}
      </h2>
      {children && (
        <p className={`mt-3 text-[15px] leading-relaxed ${invert ? "text-cream/70" : "text-ink-soft"}`}>{children}</p>
      )}
    </div>
  );
}
