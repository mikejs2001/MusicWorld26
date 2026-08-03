export default function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gold-light/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-dark ${className}`}
    >
      {children}
    </span>
  );
}
